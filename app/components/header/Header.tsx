import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { useTranslation } from 'react-i18next';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { LanguageSwitcher } from '~/components/ui/LanguageSwitcher';
import { isSidebarOpen, toggleSidebar } from '~/lib/stores/sidebar'; // Import the store and toggle function

export function Header() {
  const chat = useStore(chatStore);
  const $isSidebarOpen = useStore(isSidebarOpen); // Use the store
  const { t } = useTranslation();

  return (
    <header
      className={classNames('flex items-center p-3 sm:p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-1 sm:gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        {/* Hamburger button for mobile */}
        <button
          onClick={toggleSidebar}
          className="sm:hidden i-ph:list-bold text-xl p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          aria-label={t('toggleSidebar')}
        />
        {/* Existing sidebar icon for desktop, hidden on mobile */}
        <div className="hidden sm:block i-ph:sidebar-simple-duotone text-lg sm:text-xl" />
        <a href="/" className="text-xl sm:text-2xl font-semibold text-accent flex items-center">
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          <img
            src="/logo-light-styled.png"
            alt={t('logoAlt')}
            className="w-[75px] sm:w-[90px] inline-block dark:hidden"
          />
          <img
            src="/logo-dark-styled.png"
            alt={t('logoAlt')}
            className="w-[75px] sm:w-[90px] inline-block hidden dark:block"
          />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span
            className="flex-1 px-2 sm:px-4 truncate text-center text-bolt-elements-textPrimary"
            title={chat.description || ''} // Add title attribute here
          >
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1 flex items-center space-x-1 sm:space-x-2">
                <LanguageSwitcher />
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
      {!chat.started && (
        <div className="flex-1 flex justify-end">
          <ClientOnly>{() => <LanguageSwitcher />}</ClientOnly>
        </div>
      )}
    </header>
  );
}
