import type { Message } from 'ai';
import { Fragment } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation } from '@remix-run/react';
import { db, chatId } from '~/lib/persistence/useChatHistory';
import { forkChat } from '~/lib/persistence/db';
import { toast } from 'react-toastify';
import WithTooltip from '~/components/ui/Tooltip';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { forwardRef } from 'react';
import type { ForwardedRef } from 'react';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref: ForwardedRef<HTMLDivElement> | undefined) => {
    const { id, isStreaming = false, messages = [] } = props;
    const location = useLocation();
    const profile = useStore(profileStore);

    const handleRewind = (messageId: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('rewindTo', messageId);
      window.location.search = searchParams.toString();
    };

    const handleFork = async (messageId: string) => {
      try {
        if (!db || !chatId.get()) {
          toast.error('Chat persistence is not available');
          return;
        }

        const urlId = await forkChat(db, chatId.get()!, messageId);
        window.location.href = `/chat/${urlId}`;
      } catch (error) {
        toast.error('Failed to fork chat: ' + (error as Error).message);
      }
    };

    return (
      <div id={id} className={props.className} ref={ref}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content, id: messageId, annotations } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;
              const isLast = index === messages.length - 1;
              const isHidden = annotations?.includes('hidden');

              if (isHidden) {
                return <Fragment key={index} />;
              }

              return (
                // For RTL, reverse the main flex direction to move avatar/action buttons to the other side of message content.
                <div
                  key={messageId} // Changed from key={index} to key={messageId}
                  className={classNames('flex rtl:flex-row-reverse gap-3 sm:gap-4 p-3 sm:p-6 w-full rounded-[calc(0.75rem-1px)]', { // Adjusted padding and gap
                    'bg-bolt-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                    'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                      isStreaming && isLast,
                    'mt-3 sm:mt-4': !isFirst, // Adjusted margin
                  })}
                >
                  {isUserMessage && (
                    // Avatar is first in LTR (left). In RTL (due to flex-row-reverse), it will be visually last (right).
                    // Reduced avatar size slightly for mobile
                    <div className="flex items-center justify-center w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] overflow-hidden bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-500 rounded-full shrink-0 self-start">
                      {profile?.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile?.username || 'User'}
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="sync"
                        />
                      ) : (
                        <div className="i-ph:user-fill text-xl sm:text-2xl" /> // Adjusted icon size
                      )}
                    </div>
                  )}
                  {/* Message content container */}
                  <div className="grid grid-col-1 w-full">
                    {isUserMessage ? (
                      // UserMessage content will be right-aligned by global text-align
                      <UserMessage content={content} />
                    ) : (
                      // AssistantMessage content will be right-aligned by global text-align
                      <AssistantMessage content={content} annotations={message.annotations} />
                    )}
                  </div>
                  {!isUserMessage && (
                    // Action buttons for assistant messages. In LTR, they are last (right). In RTL (due to flex-row-reverse), they will be visually first (left).
                    // If internal order of buttons needs to change in RTL for lg screens, add rtl:lg:flex-row-reverse here.
                    // Changed to sm:flex-row to align with other responsive changes, reduced gap for mobile
                    <div className="flex gap-1 sm:gap-2 flex-col sm:flex-row rtl:sm:flex-row-reverse">
                      {messageId && (
                        <WithTooltip tooltip="Revert to this message">
                          <button
                            onClick={() => handleRewind(messageId)}
                            key="i-ph:arrow-u-up-left"
                            className={classNames(
                              'i-ph:arrow-u-up-left rtl:i-ph:arrow-u-up-right', // Swaps icon for RTL
                              'text-lg sm:text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800', // Added padding and hover
                            )}
                          />
                        </WithTooltip>
                      )}

                      <WithTooltip tooltip="Fork chat from this message">
                        <button
                          onClick={() => handleFork(messageId)}
                          key="i-ph:git-fork" // This icon is symmetrical
                          className={classNames(
                            'i-ph:git-fork', // Symmetrical, no change needed
                            'text-lg sm:text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800', // Added padding and hover
                          )}
                        />
                      </WithTooltip>
                    </div>
                  )}
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>
    );
  },
);
