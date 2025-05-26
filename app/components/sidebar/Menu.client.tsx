import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { useVirtualizer } from '@tanstack/react-virtual'; // Import useVirtualizer
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { profileStore } from '~/lib/stores/profile';
import { isSidebarOpen } from '~/lib/stores/sidebar'; // Import the sidebar store
import { isMobile } from '~/utils/mobile'; // Import isMobile utility

const menuVariantsDesktop = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    left: '-340px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    left: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const menuVariantsMobile = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    x: '-100%', // Slide out to the left
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    x: 0, // Slide in from the left
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

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

export const Menu = () => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const $isSidebarOpen = useStore(isSidebarOpen); // Use the global store
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profile = useStore(profileStore);
  const { t } = useTranslation();
  const parentScrollRef = useRef<HTMLDivElement>(null); // Ref for the scrollable parent

  // Initialize currentIsMobile directly if on client, fallback for SSR (though ClientOnly helps)
  const [currentIsMobile, setCurrentIsMobile] = useState(
    typeof window !== 'undefined' ? isMobile() : false
  );
  const [direction, setDirection] = useState('ltr');

  useEffect(() => {
    const currentDir = document.documentElement.dir || 'ltr';
    setDirection(currentDir);

    // Optional: Observe changes to dir attribute if needed
    const observer = new MutationObserver(() => {
      setDirection(document.documentElement.dir || 'ltr');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  const activeVariants = useMemo(() => {
    return currentIsMobile ? menuVariantsMobile : menuVariantsDesktop;
  }, [currentIsMobile, direction]);
    if (currentIsMobile) {
      return menuVariantsMobile; // Assuming mobile is okay or will be handled separately
    }
    if (direction === 'rtl') {
      return { // RTL Desktop Variants
        closed: {
          opacity: 0,
          visibility: 'hidden',
          right: '-340px', // Changed from left
          transition: { duration: 0.2, ease: cubicEasingFn },
        },
        open: {
          opacity: 1,
          visibility: 'initial',
          right: 0, // Changed from left
          transition: { duration: 0.2, ease: cubicEasingFn },
        },
      };
    }
    return menuVariantsDesktop; // Default LTR Desktop Variants
  }, [currentIsMobile, direction]);

  useEffect(() => {
    // Ensure it's set correctly after mount and set up resize listener
    if (typeof window !== 'undefined') {
      setCurrentIsMobile(isMobile());
    }
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setCurrentIsMobile(isMobile());
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  // Flattened list for virtualization
  const displayItems = useMemo(() => {
    const flatList: Array<{ type: 'category'; id: string; data: string } | { type: 'item'; id: string; data: ChatHistoryItem }> = [];
    const binned = binDates(filteredList);
    binned.forEach(({ category, items }) => {
      flatList.push({ type: 'category', id: category, data: category });
      items.forEach(item => {
        flatList.push({ type: 'item', id: item.id, data: item });
      });
    });
    return flatList;
  }, [filteredList]);

  const rowVirtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => parentScrollRef.current,
    estimateSize: (index) => (displayItems[index].type === 'category' ? 24 : 28), // 24px for category, 28px for item
    overscan: 10,
  });

  const virtualHistoryItems = rowVirtualizer.getVirtualItems();

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
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
            // hard page navigation to clear the stores
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error(t('failedToDeleteConversationError'));
          logger.error(error);
        });
    }
  }, []);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    if ($isSidebarOpen) {
      loadEntries();
    }
  }, [$isSidebarOpen]);

  useEffect(() => {
    // Desktop mouse hover logic
    if (currentIsMobile || isSettingsOpen) return;

    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (direction === 'rtl') {
        // RTL hover logic
        if (window.innerWidth - event.pageX < enterThreshold) {
          isSidebarOpen.set(true);
        }
        if (menuRef.current && event.clientX < menuRef.current.getBoundingClientRect().left - exitThreshold) {
          isSidebarOpen.set(false);
        }
      } else {
        // LTR hover logic (existing)
        if (event.pageX < enterThreshold) {
          isSidebarOpen.set(true);
        }
        if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
          isSidebarOpen.set(false);
        }
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isSettingsOpen, currentIsMobile, direction]); // Added direction to dependencies

  const handleDeleteClick = (event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();
    setDialogContent({ type: 'delete', item });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries(); // Reload the list after duplication
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    isSidebarOpen.set(false); // Close sidebar when settings open
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <motion.div
        ref={menuRef}
        initial="closed"
        animate={$isSidebarOpen ? 'open' : 'closed'}
        variants={activeVariants} // Use memoized variants
        className={classNames(
          'flex selection-accent flex-col side-menu fixed top-0 h-full',
          'bg-white dark:bg-gray-950',
          direction === 'rtl' ? 'border-l border-gray-100 dark:border-gray-800/50' : 'border-r border-gray-100 dark:border-gray-800/50',
          'shadow-sm text-sm',
          isSettingsOpen ? 'z-40' : 'z-sidebar',
          // Responsive width:
          // On mobile (when open): full width, or almost full width.
          // On desktop: fixed width.
          // The `left` property in variants handles showing/hiding.
          // We'll use CSS for width.
          currentIsMobile ? 'w-full sm:w-[340px]' : 'w-[340px]'
        )}
      >
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50">
          {/* On mobile, show a close button if sidebar is open */}
          {currentIsMobile && $isSidebarOpen && (
            <button
              onClick={() => isSidebarOpen.set(false)}
              className="i-ph:x-bold text-xl p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label={t('closeSidebar')}
            />
          )}
          <div className={classNames("text-gray-900 dark:text-white font-medium", currentIsMobile && $isSidebarOpen && "flex-1 text-center")}>
            {/* Potentially a title here if needed on mobile when sidebar takes full width */}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {profile?.username || t('guestUser')}
            </span>
            <div className="flex items-center justify-center w-[32px] h-[32px] overflow-hidden bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-500 rounded-full shrink-0">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile?.username || t('userAvatarAlt')}
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
        {/* Removed h-full and overflow-hidden from this div, relying on flex-1 to manage height */}
        <div className="flex-1 flex flex-col w-full">
          <div className="p-3 space-y-2"> {/* Reduced p-4 to p-3, space-y-3 to space-y-2 */}
            <a
              href="/"
              className="flex gap-2 items-center bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg px-3 py-1.5 transition-colors" /* Reduced px-4 py-2 to px-3 py-1.5 */
            >
              <span className="inline-block i-lucide:message-square h-4 w-4" />
              <span className="text-sm font-medium">{t('startNewChat')}</span>
            </a>
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <span className="i-lucide:search h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                className="w-full bg-gray-50 dark:bg-gray-900 relative pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-800"
                type="search"
                placeholder={t('searchChatsPlaceholder')}
                onChange={handleSearchChange}
                aria-label={t('searchChatsAriaLabel')}
              />
            </div>
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm font-medium px-3 py-1.5">{t('yourChatsTitle')}</div>
          <div ref={parentScrollRef} className="flex-1 overflow-auto px-3 pb-3"> {/* Added ref */}
            {displayItems.length === 0 && ( // Check displayItems for emptiness
              <div className="px-3 text-gray-500 dark:text-gray-400 text-sm">
                {list.length === 0 ? t('noPreviousConversations') : t('noMatchesFound')}
              </div>
            )}
            {displayItems.length > 0 && (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualHistoryItems.map((virtualRow) => {
                  const node = displayItems[virtualRow.index];
                  if (node.type === 'category') {
                    return (
                      <div
                        key={node.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-950 px-4 py-1 z-1" // Removed sticky, top-0. Ensure z-index if needed.
                      >
                        {node.data}
                      </div>
                    );
                  } else { // type === 'item'
                    const historyItem = node.data as ChatHistoryItem;
                    return (
                      <div
                        key={node.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="mt-2 first:mt-0" // Apply spacing similar to original (might need adjustment)
                      >
                        <div className="space-y-0.5 pr-1">
                           <HistoryItem
                              item={historyItem}
                              exportChat={exportChat}
                              onDelete={(event) => handleDeleteClick(event, historyItem)}
                              onDuplicate={() => handleDuplicate(historyItem.id)}
                            />
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
            <DialogRoot open={dialogContent !== null}>
              {/* Dialog content remains, but it's not part of the virtualized list */}
              <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                {dialogContent?.type === 'delete' && dialogContent.item && ( // Ensure item is present
                  <>
                    <div className="p-6 bg-white dark:bg-gray-950">
                      <DialogTitle className="text-gray-900 dark:text-white">{t('deleteChatTitle')}</DialogTitle>
                      <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                        <p>
                          {t('deleteChatWarningPrefix')}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dialogContent.item.description}
                          </span>
                          {t('deleteChatWarningSuffix')}
                        </p>
                        <p className="mt-2">{t('deleteChatConfirmation')}</p>
                      </DialogDescription>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                      <DialogButton type="secondary" onClick={closeDialog}>
                        {t('cancelButton')}
                      </DialogButton>
                      <DialogButton
                        type="danger"
                        onClick={(event) => {
                          deleteItem(event, dialogContent.item);
                          closeDialog();
                        }}
                      >
                        {t('deleteButton')}
                      </DialogButton>
                    </div>
                  </>
                )}
              </Dialog>
            </DialogRoot>
          </div>
          <div className="flex items-center justify-between border-t border-bolt-elements-borderColor px-3 py-2"> {/* Reduced px-4 py-3 to px-3 py-2, used theme border */}
            <SettingsButton onClick={handleSettingsClick} />
            <ThemeSwitch />
          </div>
        </div>
      </motion.div>

      <ControlPanel open={isSettingsOpen} onClose={handleSettingsClose} />
    </>
  );
};
