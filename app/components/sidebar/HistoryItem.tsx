import { useParams } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import * as Dialog from '@radix-ui/react-dialog';
import { type ChatHistoryItem } from '~/lib/persistence';
import WithTooltip from '~/components/ui/Tooltip';
import { useEditChatDescription } from '~/lib/hooks';
import { forwardRef, type ForwardedRef } from 'react';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete?: (event: React.UIEvent) => void;
  onDuplicate?: (id: string) => void;
  exportChat: (id?: string) => void;
}

export function HistoryItem({ item, onDelete, onDuplicate, exportChat }: HistoryItemProps) {
  const { id: urlId } = useParams();
  const isActiveChat = urlId === item.urlId;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription: item.description,
      customChatId: item.id,
      syncWithGlobalStore: isActiveChat,
    });

  return (
    <div
      className={classNames(
        'group rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/80 dark:hover:bg-gray-800/30 overflow-hidden flex justify-between items-center px-3 py-2 transition-colors',
        { 'text-gray-900 dark:text-white bg-gray-50/80 dark:bg-gray-800/30': isActiveChat },
      )}
    >
      {editing ? (
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          {/* Increased icon size and added padding for touch target */}
          <button
            type="submit"
            aria-label="Save chat description"
            className="i-ph:check h-5 w-5 p-1 -m-1 text-gray-500 hover:text-purple-500 transition-colors rounded-full"
            onMouseDown={handleSubmit}
          />
        </form>
      ) : (
        <a href={`/chat/${item.urlId}`} className="flex w-full relative truncate block">
          <WithTooltip tooltip={currentDescription}>
            {/* Adjusted pr-[120px] to account for always visible icons (approx 4 icons * (w-5 + p-1*2 for button) + gaps) */}
            {/* Max 4 icons: export, duplicate, rename, delete. Each icon is w-5 (20px). Button has p-1 (8px total width). So ~28px per button.
                Gap is 1.5 (6px). Total for 4 icons: 4*28 + 3*6 = 112 + 18 = 130. Plus px-2 of parent (16px).
                Let's use pr-[140px] to be safe. Or pr-[calc(4*theme(spacing.5)+3*theme(spacing.1.5)+theme(spacing.4))] if using theme.
                Using a fixed pixel value for now.
            */}
            <span className="truncate pr-[140px]">{currentDescription}</span>
          </WithTooltip>
          <div
            className={classNames(
              'absolute right-0 rtl:right-auto rtl:left-0 top-0 bottom-0 flex items-center bg-white dark:bg-gray-950 group-hover:bg-gray-50/80 dark:group-hover:bg-gray-800/30 px-2',
              { 'bg-gray-50/80 dark:bg-gray-800/30': isActiveChat },
            )}
          >
            {/* Made icons always visible by removing opacity-0 and group-hover:opacity-100. Increased icon size. Reduced gap. */}
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 transition-opacity">
              <ChatActionButton
                toolTipContent="Export"
                icon="i-ph:download-simple h-5 w-5" // Increased icon size
                onClick={(event) => {
                  event.preventDefault();
                  exportChat(item.id);
                }}
              />
              {onDuplicate && (
                <ChatActionButton
                  toolTipContent="Duplicate"
                  icon="i-ph:copy h-5 w-5" // Increased icon size
                  onClick={() => onDuplicate?.(item.id)}
                />
              )}
              <ChatActionButton
                toolTipContent="Rename"
                icon="i-ph:pencil-fill h-5 w-5" // Increased icon size
                onClick={(event) => {
                  event.preventDefault();
                  toggleEditMode();
                }}
              />
              <Dialog.Trigger asChild>
                <ChatActionButton
                  toolTipContent="Delete"
                  icon="i-ph:trash h-5 w-5" // Increased icon size
                  className="hover:text-red-500"
                  onClick={(event) => {
                    event.preventDefault();
                    onDelete?.(event);
                  }}
                />
              </Dialog.Trigger>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

const ChatActionButton = forwardRef(
  (
    {
      toolTipContent,
      icon,
      className,
      onClick,
    }: {
      toolTipContent: string;
      icon: string;
      className?: string;
      onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
      btnTitle?: string;
    },
    ref: ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <WithTooltip tooltip={toolTipContent} position="bottom" sideOffset={4}>
        {/* Increased p-1 to p-2 for better touch target area (20px icon + 16px padding = 36px) */}
        <button
          ref={ref}
          type="button"
          className={`p-2 rounded-full text-gray-400 dark:text-gray-500 hover:text-purple-500 dark:hover:text-purple-400 transition-colors ${icon} ${className ? className : ''}`}
          onClick={onClick}
        />
      </WithTooltip>
    );
  },
);
