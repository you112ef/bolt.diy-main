import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames(
        'flex flex-col md:flex-row rtl:md:flex-row-reverse items-center p-4 md:p-5 border-b h-auto md:h-[var(--header-height)]', // Increased mobile padding from p-3 to p-4
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        },
      )}
    >
      {/* For RTL, the logo div will be on the right if flex-row-reverse is active */}
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer mb-2 md:mb-0">
        {/* Sidebar toggle button - increased icon size and touch target */}
        <button 
          aria-label="Toggle sidebar" 
          className="p-2 -m-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" // -m-2 + p-2 = larger tappable area without affecting layout much
        >
          <div className="i-ph:sidebar-simple-duotone text-2xl" /> {/* Increased icon size from text-xl to text-2xl */}
        </button>
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          <img src="/logo-light-styled.png" alt="logo" className="w-[90px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="w-[90px] inline-block hidden dark:block" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          {/* ChatDescription is visually in the middle, order-last helps in flex-col. 
              In flex-row-reverse, its relative order might need adjustment if not centered.
              However, flex-1 and text-center should keep it visually centered.
              If specific ordering is needed (e.g. Logo | Actions | Description in LTR and Description | Actions | Logo in RTL),
              more complex order utilities for RTL would be required.
              Current setup: LTR (md): Logo | Description | Actions
                             RTL (md): Actions | Description | Logo (due to flex-row-reverse and source order)
          */}
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary order-last md:order-none">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              // Using logical properties for margin: me-1 (margin-end)
              // If using older Tailwind without logical properties widely, this would be:
              // className="mr-1 rtl:ml-1 mt-2 md:mt-0"
              <div className="me-1 mt-2 md:mt-0"> 
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
