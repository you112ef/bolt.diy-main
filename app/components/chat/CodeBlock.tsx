import { memo, useEffect, useState } from 'react';
import { bundledLanguages, codeToHtml, isSpecialLang, type BundledLanguage, type SpecialLanguage } from 'shiki';
import { classNames } from '~/utils/classNames';
import { createScopedLogger } from '~/utils/logger';

import styles from './CodeBlock.module.scss';

const logger = createScopedLogger('CodeBlock');

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: 'light-plus' | 'dark-plus';
  disableCopy?: boolean;
}

export const CodeBlock = memo(
  ({ className, code, language = 'plaintext', theme = 'dark-plus', disableCopy = false }: CodeBlockProps) => {
    const [html, setHTML] = useState<string | undefined>(undefined);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      if (copied) {
        return;
      }

      navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    useEffect(() => {
      if (language && !isSpecialLang(language) && !(language in bundledLanguages)) {
        logger.warn(`Unsupported language '${language}'`);
      }

      logger.trace(`Language = ${language}`);

      const processCode = async () => {
        setHTML(await codeToHtml(code, { lang: language, theme }));
      };

      processCode();
    }, [code]);

    // Note: Adding a style tag directly in JSX is generally not recommended for component reusability
    // and can be hard to manage. Ideally, this would be in a .css/.scss file.
    // However, to adhere to the prompt's suggestion of trying inline first if CodeBlock.module.scss modification is complex:
    const responsiveCodeStyle = `
      .codeblock-container pre {
        font-size: 12px !important;
      }
      @media (min-width: 640px) {
        .codeblock-container pre {
          font-size: 13px !important;
        }
      }
    `;

    return (
      <>
        <style>{responsiveCodeStyle}</style>
        <div className={classNames('relative group text-left overflow-x-auto codeblock-container', className)}>
          <div
            className={classNames(
              styles.CopyButtonContainer,
              'bg-transparant absolute top-[6px] right-[6px] sm:top-[10px] sm:right-[10px] rounded-md z-10 flex items-center justify-center opacity-0 group-hover:opacity-100',
              {
                'rounded-l-0 opacity-100': copied,
              },
            )}
          >
            {!disableCopy && (
              <button
                className={classNames(
                  'flex items-center bg-accent-500 p-[4px] sm:p-[6px] justify-center before:bg-white before:rounded-l-md before:text-gray-500 before:border-r before:border-gray-300 rounded-md transition-theme',
                  {
                    'before:opacity-0': !copied,
                    'before:opacity-100': copied,
                  },
                )}
                title="Copy Code"
                onClick={() => copyToClipboard()}
              >
                <div className="i-ph:clipboard-text-duotone text-base sm:text-lg"></div>
              </button>
            )}
          </div>
          <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
        </div>
      </>
    );
  },
);
