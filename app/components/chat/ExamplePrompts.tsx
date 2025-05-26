import React from 'react';
import { useTranslation } from 'react-i18next';

const EXAMPLE_PROMPTS_KEYS = [
  'examplePrompts.todoApp',
  'examplePrompts.blogAstro',
  'examplePrompts.cookieConsent',
  'examplePrompts.spaceInvaders',
  'examplePrompts.ticTacToe',
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  const { t } = useTranslation();
  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-6">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS_KEYS.map((examplePromptKey, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, t(examplePromptKey));
              }}
              className="border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme"
            >
              {t(examplePromptKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
