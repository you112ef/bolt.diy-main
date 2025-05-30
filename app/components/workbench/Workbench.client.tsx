import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import React, { memo, useCallback, useEffect, useState, useMemo, Suspense } from 'react'; // Added React and Suspense
import { toast } from 'react-toastify';
import { Popover, Transition } from '@headlessui/react';
import { diffLines, type Change } from 'diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import type { FileHistory } from '~/types/actions';
// import { DiffView } from './DiffView'; // Original import
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
// import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog'; // Original import

// Lazy load components
const DiffView = React.lazy(() => 
  import('./DiffView').then(module => ({ default: module.DiffView }))
);
const PushToGitHubDialog = React.lazy(() => 
  import('~/components/@settings/tabs/connections/components/PushToGitHubDialog').then(module => ({ default: module.PushToGitHubDialog }))
);

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  actionRunner: ActionRunner;
  metadata?: {
    gitUrl?: string;
  };
  updateChatMestaData?: (metadata: any) => void;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  middle: {
    value: 'diff',
    text: 'Diff',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const FileModifiedDropdown = memo(
  ({
    fileHistory,
    onSelectFile,
  }: {
    fileHistory: Record<string, FileHistory>;
    onSelectFile: (filePath: string) => void;
  }) => {
    const modifiedFiles = Object.entries(fileHistory);
    const hasChanges = modifiedFiles.length > 0;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = useMemo(() => {
      return modifiedFiles.filter(([filePath]) => filePath.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [modifiedFiles, searchQuery]);

    return (
      <div className="flex items-center gap-2">
        <Popover className="relative">
          {({ open }: { open: boolean }) => (
            <>
              {/* Increased py-1.5 to py-[10px] (10px padding) for better touch target height (14px text + 20px padding = 34px height) */}
              <Popover.Button className="flex items-center gap-2 px-3 py-[10px] text-sm rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textPrimary border border-bolt-elements-borderColor">
                <span className="font-medium">File Changes</span>
                {hasChanges && (
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-500 text-xs flex items-center justify-center border border-accent-500/30">
                    {modifiedFiles.length}
                  </span>
                )}
              </Popover.Button>
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                {/* Adjusted width: full width on small screens, max-w-xs, then w-80 on sm+ screens. Added px-2 for full-width scenarios. */}
                <Popover.Panel className="absolute right-0 rtl:right-auto rtl:left-0 z-20 mt-2 w-full max-w-xs sm:w-80 origin-top-right rtl:origin-top-left rounded-xl bg-bolt-elements-background-depth-2 shadow-xl border border-bolt-elements-borderColor">
                  <div className="p-2">
                    {/* Search input: icon padding needs to flip. Container mx-2 might be too much if panel is full width. */}
                    <div className="relative sm:mx-2 mb-2">
                      {/* Search input: icon padding needs to flip */}
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 rtl:pl-3 pr-3 rtl:pr-8 py-1.5 text-xs sm:text-sm rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50" // text-xs sm:text-sm
                      />
                      {/* Search icon position needs to flip */}
                      <div className="absolute left-2 rtl:left-auto rtl:right-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary">
                        <div className="i-ph:magnifying-glass text-base sm:text-lg" /> {/* Adjusted icon size */}
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map(([filePath, history]) => {
                          const extension = filePath.split('.').pop() || '';
                          const language = getLanguageFromExtension(extension);

                          return (
                            <button
                              key={filePath}
                              onClick={() => onSelectFile(filePath)}
                              // text-left for LTR, text-right for RTL (from global or explicit)
                              // Adjusted padding and text size for items
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left rtl:text-right rounded-md hover:bg-bolt-elements-background-depth-1 transition-colors group bg-transparent"
                            >
                              {/* For RTL, reverse the order of icon and text description */}
                              <div className="flex items-center rtl:flex-row-reverse gap-1.5 sm:gap-2">
                                <div className="shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-bolt-elements-textTertiary text-base sm:text-lg"> {/* Adjusted icon container and icon size */}
                                  {/* Icons are generally fine unless they imply directionality not handled by simple mirroring */}
                                  {['typescript', 'javascript', 'jsx', 'tsx'].includes(language) && (
                                    <div className="i-ph:file-js" />
                                  )}
                                  {['css', 'scss', 'less'].includes(language) && <div className="i-ph:paint-brush" />}
                                  {language === 'html' && <div className="i-ph:code" />}
                                  {language === 'json' && <div className="i-ph:brackets-curly" />}
                                  {language === 'python' && <div className="i-ph:file-text" />}
                                  {language === 'markdown' && <div className="i-ph:article" />}
                                  {['yaml', 'yml'].includes(language) && <div className="i-ph:file-text" />}
                                  {language === 'sql' && <div className="i-ph:database" />}
                                  {language === 'dockerfile' && <div className="i-ph:cube" />}
                                  {language === 'shell' && <div className="i-ph:terminal" />}
                                  {![
                                    'typescript',
                                    'javascript',
                                    'css',
                                    'html',
                                    'json',
                                    'python',
                                    'markdown',
                                    'yaml',
                                    'yml',
                                    'sql',
                                    'dockerfile',
                                    'shell',
                                    'jsx',
                                    'tsx',
                                    'scss',
                                    'less',
                                  ].includes(language) && <div className="i-ph:file-text" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {/* justify-between will correctly reverse the filename and diff stats in RTL */}
                                  <div className="flex items-center justify-between rtl:flex-row-reverse gap-1 sm:gap-2">
                                    <div className="flex flex-col min-w-0">
                                      {/* Text will be right-aligned due to global style. Adjusted text sizes. */}
                                      <span className="truncate text-xs sm:text-sm font-medium text-bolt-elements-textPrimary">
                                        {filePath.split('/').pop()}
                                      </span>
                                      <span className="truncate text-xs text-bolt-elements-textTertiary">
                                        {filePath}
                                      </span>
                                    </div>
                                    {(() => {
                                      // Calculate diff stats
                                      const { additions, deletions } = (() => {
                                        if (!history.originalContent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const normalizedOriginal = history.originalContent.replace(/\r\n/g, '\n');
                                        const normalizedCurrent =
                                          history.versions[history.versions.length - 1]?.content.replace(
                                            /\r\n/g,
                                            '\n',
                                          ) || '';

                                        if (normalizedOriginal === normalizedCurrent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const changes = diffLines(normalizedOriginal, normalizedCurrent, {
                                          newlineIsToken: false,
                                          ignoreWhitespace: true,
                                          ignoreCase: false,
                                        });

                                        return changes.reduce(
                                          (acc: { additions: number; deletions: number }, change: Change) => {
                                            if (change.added) {
                                              acc.additions += change.value.split('\n').length;
                                            }

                                            if (change.removed) {
                                              acc.deletions += change.value.split('\n').length;
                                            }

                                            return acc;
                                          },
                                          { additions: 0, deletions: 0 },
                                        );
                                      })();

                                      const showStats = additions > 0 || deletions > 0;

                                      return (
                                        showStats && (
                                          // Order of additions/deletions span might need rtl:flex-row-reverse if visual order matters
                                          <div className="flex items-center rtl:flex-row-reverse gap-1 text-xs shrink-0">
                                            {additions > 0 && <span className="text-green-500">+{additions}</span>}
                                            {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        // text-center is fine
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 mb-2 text-bolt-elements-textTertiary">
                            <div className="i-ph:file-dashed" />
                          </div>
                          <p className="text-sm font-medium text-bolt-elements-textPrimary">
                            {searchQuery ? 'No matching files' : 'No modified files'}
                          </p>
                          <p className="text-xs text-bolt-elements-textTertiary mt-1">
                            {searchQuery ? 'Try another search' : 'Changes will appear here as you edit'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="border-t border-bolt-elements-borderColor p-2">
                      {/* Button content (icon + text) order might need rtl:flex-row-reverse if icon should be on the other side */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(filteredFiles.map(([filePath]) => filePath).join('\n'));
                          toast('File list copied to clipboard', {
                            icon: <div className="i-ph:check-circle text-accent-500" />,
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
                      >
                        Copy File List
                      </button>
                    </div>
                  )}
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    );
  },
);

export const Workbench = memo(
  ({ chatStarted, isStreaming, actionRunner, metadata, updateChatMestaData }: WorkspaceProps) => {
    renderLogger.trace('Workbench');

    const [isSyncing, setIsSyncing] = useState(false);
    const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
    const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});

    // const modifiedFiles = Array.from(useStore(workbenchStore.unsavedFiles).keys());

    const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const selectedFile = useStore(workbenchStore.selectedFile);
    const currentDocument = useStore(workbenchStore.currentDocument);
    const unsavedFiles = useStore(workbenchStore.unsavedFiles);
    const files = useStore(workbenchStore.files);
    const selectedView = useStore(workbenchStore.currentView);

    const isSmallViewport = useViewport(1024);

    const setSelectedView = (view: WorkbenchViewType) => {
      workbenchStore.currentView.set(view);
    };

    useEffect(() => {
      if (hasPreview) {
        setSelectedView('preview');
      }
    }, [hasPreview]);

    useEffect(() => {
      workbenchStore.setDocuments(files);
    }, [files]);

    const onEditorChange = useCallback<OnEditorChange>((update) => {
      workbenchStore.setCurrentDocumentContent(update.content);
    }, []);

    const onEditorScroll = useCallback<OnEditorScroll>((position) => {
      workbenchStore.setCurrentDocumentScrollPosition(position);
    }, []);

    const onFileSelect = useCallback((filePath: string | undefined) => {
      workbenchStore.setSelectedFile(filePath);
    }, []);

    const onFileSave = useCallback(() => {
      workbenchStore.saveCurrentDocument().catch(() => {
        toast.error('Failed to update file content');
      });
    }, []);

    const onFileReset = useCallback(() => {
      workbenchStore.resetCurrentDocument();
    }, []);

    const handleSyncFiles = useCallback(async () => {
      setIsSyncing(true);

      try {
        const directoryHandle = await window.showDirectoryPicker();
        await workbenchStore.syncFiles(directoryHandle);
        toast.success('Files synced successfully');
      } catch (error) {
        console.error('Error syncing files:', error);
        toast.error('Failed to sync files');
      } finally {
        setIsSyncing(false);
      }
    }, []);

    const handleSelectFile = useCallback((filePath: string) => {
      workbenchStore.setSelectedFile(filePath);
      workbenchStore.currentView.set('diff');
    }, []);

    return (
      chatStarted && (
        <motion.div
          initial="closed"
          animate={showWorkbench ? 'open' : 'closed'}
          variants={workbenchVariants}
          // Apply styling that was on the removed 'fixed' div here or to a new direct child.
          // The motion.div will be the flex item in BaseChat.tsx.
          // It needs to handle its own height and scrolling if necessary, or ensure its children do.
          // BaseChat's <div class="workbench-container w-full h-full flex-1"> will give it space.
          className={classNames(
            "z-workbench h-full flex flex-col", // Ensure it's a flex container and takes full height
            // Add padding/margins here if they were meant for the overall workbench container
            // E.g., p-2 sm:p-4, but this might interfere with internal absolute positioning if not careful.
            // The original 'fixed' div had 'mr-0 md:mr-4 rtl:md:mr-0 rtl:md:ml-4' for side margin,
            // and 'px-2 md:px-4 lg:px-6' on an inner div.
            // The side margin is better handled by the parent flex container in BaseChat if needed.
            // The padding can be applied to the direct child that forms the visual panel.
          )}
        >
          {/* This div becomes the main visual panel with border, shadow, etc. */}
          <div className="flex-1 flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden m-0 sm:m-1 md:m-2"> {/* Added responsive margin */}
            <div className="flex flex-col md:flex-row rtl:md:flex-row-reverse items-center px-2 md:px-3 py-2 border-b border-bolt-elements-borderColor">
              <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
              <div className="ml-auto rtl:ml-0 rtl:mr-auto mt-2 md:mt-0" />
              {selectedView === 'code' && (
                <div className="flex flex-wrap justify-center md:justify-start rtl:md:justify-end overflow-y-auto gap-1 md:gap-0 rtl:flex-row-reverse">
                  <PanelHeaderButton
                    className="text-xs md:text-sm"
                    onClick={() => {
                      workbenchStore.downloadZip();
                    }}
                  >
                    <div className="i-ph:code" />
                    <span className="hidden sm:inline">Download Code</span>
                    <span className="sm:hidden">Download</span>
                  </PanelHeaderButton>
                  <PanelHeaderButton className="text-xs md:text-sm" onClick={handleSyncFiles} disabled={isSyncing}>
                    {isSyncing ? <div className="i-ph:spinner" /> : <div className="i-ph:cloud-arrow-down" />}
                    {isSyncing ? 'Syncing...' : <span className="hidden sm:inline">Sync Files</span>}
                    {isSyncing || <span className="sm:hidden">Sync</span>}
                  </PanelHeaderButton>
                  <PanelHeaderButton
                    className="text-xs md:text-sm"
                    onClick={() => {
                      workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                    }}
                  >
                    <div className="i-ph:terminal" />
                    <span className="hidden sm:inline">Toggle Terminal</span>
                    <span className="sm:hidden">Terminal</span>
                  </PanelHeaderButton>
                  <PanelHeaderButton className="text-xs md:text-sm" onClick={() => setIsPushDialogOpen(true)}>
                    <div className="i-ph:git-branch" />
                    <span className="hidden sm:inline">Push to GitHub</span>
                    <span className="sm:hidden">GitHub</span>
                  </PanelHeaderButton>
                </div>
              )}
              {selectedView === 'diff' && (
                <FileModifiedDropdown fileHistory={fileHistory} onSelectFile={handleSelectFile} />
              )}
              <IconButton
                icon="i-ph:x-circle"
                className="-mr-1 rtl:mr-0 rtl:-ml-1" // Adjusted class for RTL margin
                size="xl"
                onClick={() => {
                  workbenchStore.showWorkbench.set(false);
                }}
              />
            </div>
            <div className="relative flex-1 overflow-hidden">
              {/*
                Simplified conceptual animation logic for RTL.
                A more robust solution might involve a hook or context for direction.
                This assumes 'ltr' as default if document is not yet available.
              */}
              <View
                initial={{ x: '0%' }}
                animate={{ x: selectedView === 'code' ? '0%' : ((typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? '100%' : '-100%') }}
              >
                <EditorPanel
                  editorDocument={currentDocument}
                  isStreaming={isStreaming}
                  selectedFile={selectedFile}
                  files={files}
                  unsavedFiles={unsavedFiles}
                  fileHistory={fileHistory}
                  onFileSelect={onFileSelect}
                  onEditorScroll={onEditorScroll}
                  onEditorChange={onEditorChange}
                  onFileSave={onFileSave}
                  onFileReset={onFileReset}
                />
              </View>
              <View
                initial={{ x: ((typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? '-100%' : '100%') }}
                animate={{
                  x: selectedView === 'diff' ? '0%' :
                     selectedView === 'code' ? ((typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? '-100%' : '100%') :
                                              ((typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? '100%' : '-100%')
                }}
              >
                <Suspense fallback={<div className="p-4 text-center">Loading Diff View...</div>}>
                  <DiffView fileHistory={fileHistory} setFileHistory={setFileHistory} actionRunner={actionRunner} />
                </Suspense>
              </View>
              <View
                initial={{ x: ((typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? '-100%' : '100%') }}
                animate={{ x: selectedView === 'preview' ? '0%' : ((typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? '-100%' : '100%') }}
              >
                <Preview />
              </View>
            </div>
          </div>
          {isPushDialogOpen && ( // Conditionally render Suspense and Dialog
            <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center text-white">Loading Dialog...</div>}>
              <PushToGitHubDialog
                isOpen={isPushDialogOpen}
                onClose={() => setIsPushDialogOpen(false)}
                onPush={async (repoName, username, token) => {
                  try {
                    const commitMessage = prompt('Please enter a commit message:', 'Initial commit') || 'Initial commit';
                    await workbenchStore.pushToGitHub(repoName, commitMessage, username, token);

                    const repoUrl = `https://github.com/${username}/${repoName}`;

                    if (updateChatMestaData && !metadata?.gitUrl) {
                      updateChatMestaData({
                        ...(metadata || {}),
                        gitUrl: repoUrl,
                      });
                    }

                    return repoUrl;
                  } catch (error) {
                    console.error('Error pushing to GitHub:', error);
                    toast.error('Failed to push to GitHub');
                    throw error;
                  }
                }}
              />
            </Suspense>
          )}
        </motion.div>
      )
    );
  },
);

// View component for rendering content with motion transitions
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
