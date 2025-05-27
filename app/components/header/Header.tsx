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
      className={classNames('flex items-center p-3 sm:p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-lg sm:text-xl" />
        {/* Changed to text for RTL testing */}
        <a href="/" className="text-xl sm:text-2xl font-semibold text-accent flex items-center">
          مرحباً بالعالم {/* Arabic for "Hello World" */}
          {/* <img src="/logo-light-styled.png" alt="logo" className="w-[70px] sm:w-[90px] inline-block dark:hidden" /> */}
          {/* <img src="/logo-dark-styled.png" alt="logo" className="w-[70px] sm:w-[90px] inline-block hidden dark:block" /> */}
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 ps-4 pe-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="me-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
