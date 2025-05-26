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

    return (
      <div className={classNames('relative group text-left', className)}>
        <div
          className={classNames(
            styles.CopyButtonContainer,
            'bg-transparant absolute top-[10px] right-[10px] rtl:right-auto rtl:left-[10px] rounded-md z-10 text-lg flex items-center justify-center opacity-0 group-hover:opacity-100',
            {
              // LTR: when copied, left corners of container become sharp.
              // RTL: when copied, right corners of container become sharp.
              'rounded-l-none': copied && document.documentElement.dir !== 'rtl', // LTR copied
              'rtl:rounded-r-none': copied && document.documentElement.dir === 'rtl', // RTL copied
              'opacity-100': copied, // Always show if copied
            },
          )}
        >
          {!disableCopy && (
            <button
              className={classNames(
                'flex items-center bg-accent-500 p-[6px] justify-center rounded-md transition-theme',
                // Before pseudo-element for "Copied!" text background styling
                // LTR: before has rounded-l-md, border-r
                // RTL: before has rounded-r-md, border-l
                'before:bg-white before:text-gray-500',
                copied && document.documentElement.dir !== 'rtl' ? 'before:rounded-l-md before:border-r before:border-gray-300' : '',
                copied && document.documentElement.dir === 'rtl' ? 'rtl:before:rounded-r-md rtl:before:border-l rtl:before:border-gray-300 rtl:before:border-r-0' : '',
                {
                  'before:opacity-0': !copied,
                  'before:opacity-100': copied,
                },
              )}
              title="Copy Code"
              onClick={() => copyToClipboard()}
            >
              <div className="i-ph:clipboard-text-duotone"></div>
            </button>
          )}
        </div>
        {/* Wrapper div for horizontal scrolling and responsive font size */}
        <div className="overflow-x-auto text-xs sm:text-sm">
          <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
        </div>
      </div>
    );
  },
);
