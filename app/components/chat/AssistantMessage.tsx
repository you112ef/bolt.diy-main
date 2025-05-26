import { memo } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import Popover from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import { IconButton } from '~/components/ui/IconButton'; // Import IconButton

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

export const AssistantMessage = memo(({ content, annotations }: AssistantMessageProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any } & { [key: string]: any }[];

  let chatSummary: string | undefined = undefined;

  if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
    chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
  }

  let codeContext: string[] | undefined = undefined;

  if (filteredAnnotations.find((annotation) => annotation.type === 'codeContext')) {
    codeContext = filteredAnnotations.find((annotation) => annotation.type === 'codeContext')?.files;
  }

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  return (
    <div className="overflow-hidden w-full">
      <>
        <div className=" flex gap-2 items-center text-sm text-bolt-elements-textSecondary mb-2 rtl:flex-row-reverse">
          {(codeContext || chatSummary) && (
            // For Popover, side="right" should become side="left" in RTL.
            // Assuming Popover component can take a dynamic side or has RTL awareness.
            // Conceptual change: side={document.documentElement.dir === 'rtl' ? 'left' : 'right'}
            // For this task, let's assume we can use a data attribute or a class that the Popover component respects,
            // or we'd need to conditionally pass the prop. Since we are focusing on SCSS/Tailwind for most,
            // this is a limitation. If Popover doesn't auto-adjust, this needs JS.
            // Let's add an RTL variant for the trigger if that helps, but the prop is key.
            <Popover 
              side={typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'left' : 'right'} 
              align="start" 
              trigger={
                <IconButton 
                  title="View context/summary" 
                  size="sm" // Use 'sm' or 'md' size from IconButton for appropriate sizing
                  className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary" // Maintain similar styling
                  iconClassName="i-ph:info" // Pass icon class to IconButton
                />
              }
            >
              {chatSummary && (
                <div className="max-w-chat">
                  <div className="summary max-h-96 flex flex-col">
                    <h2 className="border border-bolt-elements-borderColor rounded-md p4">Summary</h2>
                    <div style={{ zoom: 0.7 }} className="overflow-y-auto m4">
                      <Markdown>{chatSummary}</Markdown>
                    </div>
                  </div>
                  {codeContext && (
                    <div className="code-context flex flex-col p4 border border-bolt-elements-borderColor rounded-md">
                      <h2>Context</h2>
                      {/* The `gap-4` will ensure spacing is correct. If order of items in codeContext needs reversing, that's JS data manipulation. */}
                      <div className="flex flex-wrap gap-4 mt-4 bolt" style={{ zoom: 0.6 }}>
                        {codeContext.map((x) => {
                          const normalized = normalizedFilePath(x);
                          return (
                            <>
                              <code
                                className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1.5 py-1 rounded-md text-bolt-elements-item-contentAccent hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openArtifactInWorkbench(normalized);
                                }}
                              >
                                {normalized} {/* Text will be right-aligned */}
                              </code>
                            </>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="context"></div>
            </Popover>
          )}
          {usage && (
            <div className="text-left rtl:text-right"> {/* Ensure usage text also respects RTL text alignment */}
              Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
            </div>
          )}
        </div>
      </>
      <Markdown html>{content}</Markdown>
    </div>
  );
});
