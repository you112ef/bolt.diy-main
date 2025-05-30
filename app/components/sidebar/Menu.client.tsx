import { motion, type Variants } from 'framer-motion';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { isMobile } from '~/utils/mobile'; // Added import
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
// import { ControlPanel } from '~/components/@settings/core/ControlPanel'; // Original import, ensure it's correctly placed if re-enabled
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';

// Define props interface
interface MenuProps {
  isMobileMenuOpen?: boolean;
  toggleMobileMenu?: () => void;
}

// Note: This would ideally be dynamically generated based on document.dir,
// but Framer Motion variants are defined at module scope.
// For a full solution, this might need to be part of the component's state or props,
// or a separate set of variants could be chosen dynamically.
// For this task, we'll assume a mechanism to select RTL variants if dir is rtl.
// Let's simulate this by defining RTL-specific variants here for clarity,
// though the actual dynamic application in JS is more involved.

const ltrMenuVariantsDesktop = {
  closed: { opacity: 0, visibility: 'hidden' as const, left: '-340px', transition: { duration: 0.2, ease: cubicEasingFn } },
  open: { opacity: 1, visibility: 'visible' as const, left: '0px', transition: { duration: 0.2, ease: cubicEasingFn } },
} satisfies Variants;

const rtlMenuVariantsDesktop = {
  closed: { opacity: 0, visibility: 'hidden' as const, right: '-340px', transition: { duration: 0.2, ease: cubicEasingFn } },
  open: { opacity: 1, visibility: 'visible' as const, right: '0px', transition: { duration: 0.2, ease: cubicEasingFn } },
} satisfies Variants;

const ltrMenuVariantsMobile = {
  closed: { x: '-100%', transition: { duration: 0.3, ease: cubicEasingFn } },
  open: { x: '0%', transition: { duration: 0.3, ease: cubicEasingFn } },
} satisfies Variants;

const rtlMenuVariantsMobile = {
  closed: { x: '100%', transition: { duration: 0.3, ease: cubicEasingFn } },
  open: { x: '0%', transition: { duration: 0.3, ease: cubicEasingFn } },
} satisfies Variants;


// Helper to choose variants
const getMenuVariants = (isMobileView: boolean) => {
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  if (isMobileView) {
    return isRtl ? rtlMenuVariantsMobile : ltrMenuVariantsMobile;
  }
  return isRtl ? rtlMenuVariantsDesktop : ltrMenuVariantsDesktop;
};

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800/50">
      <div className="h-4 w-4 i-lucide:clock opacity-80" />
      <div className="flex gap-2">
        <span>{dateTime.toLocaleDateString()}</span>
        <span>{dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

export const Menu: React.FC<MenuProps> = ({ isMobileMenuOpen, toggleMobileMenu }) => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false); // Renamed 'open' to 'isDesktopMenuOpen'
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profile = useStore(profileStore);
  const mobileView = isMobile(); // Determine once

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((listData) => listData.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  const deleteItem = useCallback((event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();

    if (db) {
      deleteById(db, item.id)
        .then(() => {
          loadEntries();
          if (chatId.get() === item.id) {
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    }
  }, [loadEntries]);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    // Load entries if desktop menu is open or (initially) if mobile menu is open
    if (isDesktopMenuOpen || (mobileView && isMobileMenuOpen)) {
      loadEntries();
    }
  }, [isDesktopMenuOpen, isMobileMenuOpen, loadEntries, mobileView]);

  useEffect(() => {
    if (mobileView) return; // Disable mouse move listener on mobile

    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (isSettingsOpen) {
        return;
      }

      const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

      if (isRtl) {
        if (event.pageX > window.innerWidth - enterThreshold) {
          setIsDesktopMenuOpen(true);
        }
      } else {
        if (event.pageX < enterThreshold) {
          setIsDesktopMenuOpen(true);
        }
      }

      if (menuRef.current) {
        if (isRtl) {
          if (event.clientX < menuRef.current.getBoundingClientRect().left - exitThreshold) {
            setIsDesktopMenuOpen(false);
          }
        } else {
          if (event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
            setIsDesktopMenuOpen(false);
          }
        }
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isSettingsOpen, mobileView]);

  const handleDeleteClick = (event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();
    setDialogContent({ type: 'delete', item });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries();
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    if (mobileView && toggleMobileMenu) {
      toggleMobileMenu(); // Close mobile menu if open
    } else {
      setIsDesktopMenuOpen(false); // Close desktop menu
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const ControlPanel = React.lazy(() =>
    import('~/components/@settings/core/ControlPanel').then(module => ({ default: module.ControlPanel }))
  );

  const currentMenuOpenState = mobileView ? isMobileMenuOpen : isDesktopMenuOpen;
  // Do not render the menu on desktop if it's not open and not mobile view
  // For mobile, we render it and control visibility with variants and CSS, because it's part of the header flow for now
  if (!mobileView && !currentMenuOpenState && !isSettingsOpen) {
     // To ensure framer-motion can animate out, we might need a different approach
     // For now, this prevents rendering the div entirely on desktop when closed.
     // However, framer-motion's AnimatePresence is better for exit animations.
     // Let's keep it rendered for now and rely on visibility: 'hidden' from variants.
  }

  return (
    <>
      {mobileView && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-menu-overlay md:hidden"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
      <motion.div
        ref={menuRef}
        initial="closed"
        animate={currentMenuOpenState ? 'open' : 'closed'}
        variants={getMenuVariants(mobileView)}
        style={{ width: mobileView ? 'clamp(280px, 80vw, 340px)' : 'clamp(280px, 80vw, 340px)' }} // Width can be adjusted for mobile if needed
        className={classNames(
          'flex selection-accent flex-col side-menu fixed top-0 h-full',
          'bg-white dark:bg-gray-950 border-r rtl:border-r-0 rtl:border-l border-gray-100 dark:border-gray-800/50',
          'shadow-sm text-sm',
          // Ensure mobile menu is on top of other elements, but below settings if settings are open
          isSettingsOpen ? 'z-settings-panel' : (mobileView ? 'z-mobile-menu' : 'z-sidebar'),
          { 'hidden': !mobileView && !currentMenuOpenState && !isSettingsOpen } // Hide on desktop if not open and settings not open
        )}
      >
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50">
          {/* Close button for mobile */}
          {mobileView && (
            <button
              aria-label="Close menu"
              className="p-2 -m-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={toggleMobileMenu}
            >
              <div className="i-ph:x-bold text-xl" />
            </button>
          )}
          {/* Placeholder for title or other elements if needed, or adjust styling if only profile shows */}
          <div className={classNames("text-gray-900 dark:text-white font-medium", { "flex-grow text-center": !mobileView })}>
            {/* {!mobileView && "Menu Title"} You can add a title for desktop if needed */}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {profile?.username || 'Guest User'}
            </span>
            <div className="flex items-center justify-center w-[32px] h-[32px] overflow-hidden bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-500 rounded-full shrink-0">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile?.username || 'User'}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div className="i-ph:user-fill text-lg" />
              )}
            </div>
          </div>
        </div>
        <CurrentDateTime />
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          <div className="p-3 md:p-4 space-y-3">
            <a
              href="/"
              onClick={mobileView && toggleMobileMenu ? toggleMobileMenu : undefined} // Close mobile menu on navigation
              className="flex gap-2 items-center bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base transition-colors" // Adjusted padding and text size
            >
              <span className="inline-block i-lucide:message-square h-5 w-5" />
              <span className="font-medium">Start new chat</span>
            </a>
            <div className="relative w-full">
              <div className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2">
                <span className="i-lucide:search h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                className="w-full bg-gray-50 dark:bg-gray-900 relative pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-1.5 text-xs sm:py-2 sm:text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-800" // Adjusted padding and text size
                type="search"
                placeholder="Search chats..."
                onChange={handleSearchChange}
                aria-label="Search chats"
              />
            </div>
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm font-medium px-3 md:px-4 py-2">Your Chats</div>
          <div className="flex-1 overflow-auto px-2 md:px-3 pb-3">
            {filteredList.length === 0 && (
              <div className="px-3 md:px-4 text-gray-500 dark:text-gray-400 text-sm">
                {list.length === 0 ? 'No previous conversations' : 'No matches found'}
              </div>
            )}
            <DialogRoot open={dialogContent !== null}>
              {binDates(filteredList).map(({ category, items }) => (
                <div key={category} className="mt-2 first:mt-0 space-y-1">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 sticky top-0 z-1 bg-white dark:bg-gray-950 px-3 md:px-4 py-1">
                    {category}
                  </div>
                  <div className="space-y-0.5 pr-0.5 rtl:pr-0 md:pr-1 rtl:md:pr-0 rtl:pl-0.5 rtl:md:pl-1">
                    {items.map((item) => (
                      <HistoryItem
                        key={item.id}
                        item={item}
                        exportChat={exportChat}
                        onDelete={(event) => handleDeleteClick(event, item)}
                        onDuplicate={() => handleDuplicate(item.id)}
                        onItemClick={mobileView && toggleMobileMenu ? toggleMobileMenu : undefined} // Close mobile menu on item click
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                {dialogContent?.type === 'delete' && (
                  <>
                    {/* Adjusted padding for dialog content */}
                    <div className="p-4 sm:p-6 bg-white dark:bg-gray-950">
                      <DialogTitle className="text-gray-900 dark:text-white">Delete Chat?</DialogTitle>
                      <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base"> {/* Ensure text size is responsive if needed */}
                        <p>
                          You are about to delete{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dialogContent.item.description}
                          </span>
                        </p>
                        <p className="mt-2">Are you sure you want to delete this chat?</p>
                      </DialogDescription>
                    </div>
                    {/* Adjusted padding and gap for dialog actions */}
                    <div className="flex justify-end rtl:justify-start gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                      <DialogButton type="secondary" onClick={closeDialog}>
                        Cancel
                      </DialogButton>
                      <DialogButton
                        type="danger"
                        onClick={(event) => {
                          if (dialogContent) { // Ensure dialogContent is not null
                            deleteItem(event, dialogContent.item);
                          }
                          closeDialog();
                        }}
                      >
                        Delete
                      </DialogButton>
                    </div>
                  </>
                )}
              </Dialog>
            </DialogRoot>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3">
            <SettingsButton onClick={handleSettingsClick} />
            <ThemeSwitch />
          </div>
        </div>
      </motion.div>

      {/* Conditionally render ControlPanel with Suspense */}
      {isSettingsOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-settings-panel-loading flex items-center justify-center text-white">Loading Settings...</div>}>
          <ControlPanel open={isSettingsOpen} onClose={handleSettingsClose} />
        </Suspense>
      )}
    </>
  );
};
