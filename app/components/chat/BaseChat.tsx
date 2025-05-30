/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState, Suspense, lazy, useRef } from 'react'; // Added Suspense, lazy, useRef
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
// import { Workbench } from '~/components/workbench/Workbench.client'; // Original import
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { APIKeyManager, getApiKeysFromCookies } from './APIKeyManager';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';

import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import GitCloneButton from './GitCloneButton';

import FilePreview from './FilePreview';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert, SupabaseAlert } from '~/types/actions';
import ChatAlert from './ChatAlert';
import type { ModelInfo } from '~/lib/modules/llm/types';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import type { ActionRunner } from '~/lib/runtime/action-runner';
import { LOCAL_PROVIDERS, providersStore as appProvidersStore } from '~/lib/stores/settings'; // Renamed to appProvidersStore to avoid conflict
import { SupabaseChatAlert } from '~/components/chat/SupabaseAlert';
import { SupabaseConnection } from './SupabaseConnection';
import { connectionStatusStore } from '~/lib/stores/connection';
import { useStore } from '@nanostores/react';
import { useSettings } from '~/lib/hooks/useSettings'; // To get provider settings

const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  supabaseAlert?: SupabaseAlert;
  clearSupabaseAlert?: () => void;
  data?: JSONValue[] | undefined;
  actionRunner?: ActionRunner;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      input = '',
      enhancingPrompt,
      handleInputChange,

      // promptEnhanced,
      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      supabaseAlert,
      clearSupabaseAlert,
      data,
      actionRunner,
    },
    ref,
  ) => {
    // Lazy load Workbench - removed duplicate, changed to React.lazy
    const Workbench = React.lazy(() => import('~/components/workbench/Workbench.client').then(module => ({ default: module.Workbench })));

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
    const [modelList, setModelList] = useState<ModelInfo[]>([]); // This holds all models
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
    const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);

    const isOnline = useStore(connectionStatusStore);
    const { providers: providerSettingsFromStore } = useSettings(); // Access provider settings
    const offlineToastId = useRef<React.ReactText | null>(null); // To store the ID of the persistent offline toast

    useEffect(() => {
      if (!isOnline) {
        // Dismiss any previous offline toast before showing a new one
        if (offlineToastId.current) {
          toast.dismiss(offlineToastId.current);
        }

        const ollamaProviderConfig = providerSettingsFromStore['Ollama'];
        const currentProviderName = provider?.name;

        if (currentProviderName !== 'Ollama' && ollamaProviderConfig?.settings?.enabled && ollamaProviderConfig?.settings?.baseUrl) {
          const ollamaProviderInfo = providerList?.find(p => p.name === 'Ollama');
          if (ollamaProviderInfo && setProvider && setModel) {
            setProvider(ollamaProviderInfo);
            // Find first available Ollama model from the full modelList
            const firstOllamaModel = modelList.find(m => m.provider === 'Ollama');
            if (firstOllamaModel) {
              setModel(firstOllamaModel.name);
              offlineToastId.current = toast.info("You are offline. Switched to local Ollama model: " + firstOllamaModel.name, { autoClose: false, theme: "colored", toastId: "offline-ollama-switch" });
            } else {
              // Attempt to set a common default if model list for Ollama isn't populated yet
              // This might happen if dynamic models weren't fetched before going offline
              setModel("llama3"); // Or any other sensible default you expect
              offlineToastId.current = toast.warn("You are offline. Switched to local Ollama. Model list unavailable, set to default.", { autoClose: false, theme: "colored", toastId: "offline-ollama-default" });
            }
          } else {
            offlineToastId.current = toast.error("Offline: Ollama provider not found or setters unavailable.", { autoClose: false, theme: "colored", toastId: "offline-ollama-error" });
          }
        } else if (currentProviderName === 'Ollama' && (!ollamaProviderConfig?.settings?.enabled || !ollamaProviderConfig?.settings?.baseUrl)) {
            offlineToastId.current = toast.warn("You are offline and Ollama is not configured. Please configure Ollama to continue.", { autoClose: false, theme: "colored", toastId: "offline-ollama-not-configured" });
        } else if (currentProviderName === 'Ollama') {
            offlineToastId.current = toast.info("You are offline, using local Ollama model.", { autoClose: false, theme: "colored", toastId: "offline-ollama-active" });
        } else {
          offlineToastId.current = toast.warn("You are offline. Connect to the internet or configure a local Ollama provider.", { autoClose: false, theme: "colored", toastId: "offline-general" });
        }
      } else { // isOnline is true
        if (offlineToastId.current) {
          toast.dismiss(offlineToastId.current);
          offlineToastId.current = null;
        }
        // Check if the previous state was offline (requires knowing previous isOnline state or checking if a toast was active)
        // For simplicity, we show "back online" if an offline toast was just dismissed.
        // A more robust way would be to store previous online state.
        if (document.querySelector('.Toastify__toast--warning, .Toastify__toast--info[role="status"]')) { // Heuristic: if an offline toast was visible
            toast.success("You are back online.", { autoClose: 3000, theme: "colored" });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, provider?.name, providerSettingsFromStore, providerList, modelList, setProvider, setModel]);


    useEffect(() => {
      if (data) {
        const progressList = data.filter(
          (x) => typeof x === 'object' && (x as any).type === 'progress',
        ) as ProgressAnnotation[];
        setProgressAnnotations(progressList);
      }
    }, [data]);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);

    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        let parsedApiKeys: Record<string, string> | undefined = {};

        try {
          parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
        } catch (error) {
          console.error('Error loading API keys from cookies:', error);
          Cookies.remove('apiKeys');
        }

        setIsModelLoading('all');
        fetch('/api/models')
          .then((response) => response.json())
          .then((data) => {
            const typedData = data as { modelList: ModelInfo[] };
            setModelList(typedData.modelList);
          })
          .catch((error) => {
            console.error('Error fetching model list:', error);
          })
          .finally(() => {
            setIsModelLoading(undefined);
          });
      }
    }, [providerList, provider]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set('apiKeys', JSON.stringify(newApiKeys));

      setIsModelLoading(providerName);

      let providerModels: ModelInfo[] = [];

      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data = await response.json();
        providerModels = (data as { modelList: ModelInfo[] }).modelList;
      } catch (error) {
        console.error('Error loading dynamic models for:', providerName, error);
      }

      // Only update models for the specific provider
      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model) => model.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(undefined);
    };

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (sendMessage) {
        sendMessage(event, messageInput);

        if (recognition) {
          recognition.abort(); // Stop current recognition
          setTranscript(''); // Clear transcript
          setIsListening(false);

          // Clear the input by triggering handleInputChange with empty value
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        {/* For RTL, on sm+ screens, reverse the order of Chat and Workbench */}
        <div ref={scrollRef} className="flex flex-col sm:flex-row rtl:sm:flex-row-reverse overflow-y-auto w-full h-full">
          {/* Chat Area: Takes full width on mobile, min-width on sm+ screens */}
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow w-full sm:min-w-[var(--chat-min-width)] sm:w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              // mx-auto and text-center are fine for RTL. Adjusted padding for smaller screens.
              <div id="intro" className="mt-[10vh] sm:mt-[16vh] max-w-chat mx-auto text-center px-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in"> {/* Adjusted mobile text size, removed lg specific */}
                  Where ideas begin
                </h1>
                <p className="text-sm sm:text-md mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200"> {/* Adjusted mobile text size, removed lg specific */}
                  Bring ideas to life in seconds or get help on existing projects.
                </p>
              </div>
            )}
            {/* Content within Chat area */}
            <div
              className={classNames('pt-3 sm:pt-6 px-3 sm:px-6 flex flex-col w-full', { // Ensure w-full for flex-col content
                'h-full': chatStarted, // Take full height if chat started
                'flex-grow': chatStarted, // Allow Messages to take available space
              })}
              // scrollRef is on the parent, this inner div shouldn't also have it if parent handles scrolling
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages
                      ref={messageRef}
                      // max-w-chat will be applied by --chat-max-width from variables.scss which is 100% on mobile.
                      // On sm+ it becomes 37rem. This should correctly constrain message width.
                      className="flex flex-col w-full flex-1 pb-6 mx-auto z-1"
                      style={{ maxWidth: 'var(--chat-max-width)' }} // Explicitly use the variable
                      messages={messages}
                      isStreaming={isStreaming}
                    />
                  ) : null;
                }}
              </ClientOnly>
              {/* Prompt input area and associated buttons/alerts */}
              {/* This container needs to respect the --chat-max-width as well */}
              <div
                className={classNames('flex flex-col gap-4 w-full z-prompt mb-3 sm:mb-6', { // Adjusted bottom margin for mobile
                  'sticky bottom-0 pb-1 sm:pb-0': chatStarted, // Adjusted sticky behavior for mobile
                })}
                style={{ maxWidth: 'var(--chat-max-width)', marginInline: 'auto' }} // Use auto for horizontal margin for centering
              >
                {supabaseAlert && (
                  <SupabaseChatAlert
                    alert={supabaseAlert}
                    clearAlert={() => clearSupabaseAlert?.()}
                    postMessage={(message) => {
                      sendMessage?.({} as any, message);
                      clearSupabaseAlert?.();
                    }}
                  />
                )}
                <div className="bg-bolt-elements-background-depth-2"> {/* This class might need review if it adds unwanted bg under sticky */}
                  {actionAlert && (
                    <ChatAlert
                      alert={actionAlert}
                      clearAlert={() => clearAlert?.()}
                      postMessage={(message) => {
                        sendMessage?.({} as any, message);
                        clearAlert?.();
                      }}
                    />
                  )}
                </div>
                {progressAnnotations && <ProgressCompilation data={progressAnnotations} />}
                <div
                  className={classNames(
                    'bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full z-prompt', // Removed max-w-chat and mx-auto from here, handled by parent
                  )}
                >
                  <svg className={classNames(styles.PromptEffectContainer)}>
                    <defs>
                      <linearGradient
                        id="line-gradient"
                        x1="20%"
                        y1="0%"
                        x2="-14%"
                        y2="10%"
                        gradientUnits="userSpaceOnUse"
                        gradientTransform="rotate(-45)"
                      >
                        <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
                      </linearGradient>
                      <linearGradient id="shine-gradient">
                        <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                      </linearGradient>
                    </defs>
                    <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
                    <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                  </svg>
                  <div>
                    <ClientOnly>
                      {() => (
                        <div className={isModelSettingsCollapsed ? 'hidden' : ''}>
                          <ModelSelector
                            key={provider?.name + ':' + modelList.length}
                            model={model}
                            setModel={setModel}
                            modelList={modelList}
                            provider={provider}
                            setProvider={setProvider}
                            providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                            apiKeys={apiKeys}
                            modelLoading={isModelLoading}
                          />
                          {(providerList || []).length > 0 &&
                            provider &&
                            (!LOCAL_PROVIDERS.includes(provider.name) || 'OpenAILike') && ( // Ensure OpenAILike also shows APIKeyManager
                              <APIKeyManager
                                provider={provider}
                                apiKey={apiKeys[provider.name] || ''}
                                setApiKey={(key) => {
                                  onApiKeysChange(provider.name, key);
                                }}
                              />
                            )}
                        </div>
                      )}
                    </ClientOnly>
                  </div>
                  <FilePreview
                    files={uploadedFiles}
                    imageDataList={imageDataList}
                    onRemove={(index) => {
                      setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                      setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                    }}
                  />
                  <ClientOnly>
                    {() => (
                      <ScreenshotStateManager
                        setUploadedFiles={setUploadedFiles}
                        setImageDataList={setImageDataList}
                        uploadedFiles={uploadedFiles}
                        imageDataList={imageDataList}
                      />
                    )}
                  </ClientOnly>
                  <div
                    className={classNames(
                      'relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg', // Ensure backdrop-blur doesn't cause perf issues on mobile
                    )}
                  >
                    <textarea
                      ref={textareaRef}
                      className={classNames(
                        'w-full pl-3 sm:pl-4 rtl:pl-12 sm:rtl:pl-16 pt-3 sm:pt-4 pr-12 sm:pr-16 rtl:pr-3 sm:rtl:pr-4 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-xs sm:text-sm',
                        'transition-all duration-200',
                        // 'hover:border-bolt-elements-focus', // This might be too subtle or covered by other focus styles
                      )}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '2px solid #1488fc';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '2px solid #1488fc';
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

                        const files = Array.from(e.dataTransfer.files);
                        files.forEach((file) => {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();

                            reader.onload = (e) => {
                              const base64Image = e.target?.result as string;
                              setUploadedFiles?.([...uploadedFiles, file]);
                              setImageDataList?.([...imageDataList, base64Image]);
                            };
                            reader.readAsDataURL(file);
                          }
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          if (event.shiftKey) {
                            return;
                          }
                          event.preventDefault();
                          if (isStreaming) {
                            handleStop?.();
                            return;
                          }
                          if (event.nativeEvent.isComposing) {
                            return;
                          }
                          handleSendMessage?.(event);
                        }
                      }}
                      value={input}
                      onChange={(event) => {
                        handleInputChange?.(event);
                      }}
                      onPaste={handlePaste}
                      style={{
                        minHeight: TEXTAREA_MIN_HEIGHT, // 76px
                        maxHeight: TEXTAREA_MAX_HEIGHT, // 400px or 200px
                      }}
                      placeholder="How can Bolt help you today?"
                      translate="no"
                    />
                    <ClientOnly>
                      {() => (
                        <SendButton
                          show={input.length > 0 || isStreaming || uploadedFiles.length > 0}
                          isStreaming={isStreaming}
                          disabled={!providerList || providerList.length === 0}
                          onClick={(event) => {
                            if (isStreaming) {
                              handleStop?.();
                              return;
                            }
                            if (input.length > 0 || uploadedFiles.length > 0) {
                              handleSendMessage?.(event);
                            }
                          }}
                        />
                      )}
                    </ClientOnly>
                    <div className="flex justify-between items-center p-2 sm:p-4 pt-1 sm:pt-2">
                      <div className="flex gap-1 items-center rtl:flex-row-reverse">
                        <IconButton title="Upload file" className="transition-all" onClick={() => handleFileUpload()}>
                          <div className="i-ph:paperclip text-lg sm:text-xl"></div>
                        </IconButton>
                        <IconButton
                          title="Enhance prompt"
                          disabled={input.length === 0 || enhancingPrompt}
                          className={classNames('transition-all', enhancingPrompt ? 'opacity-100' : '')}
                          onClick={() => {
                            enhancePrompt?.();
                            toast.success('Prompt enhanced!');
                          }}
                        >
                          {enhancingPrompt ? (
                            <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-lg sm:text-xl animate-spin"></div>
                          ) : (
                            <div className="i-bolt:stars text-lg sm:text-xl"></div>
                          )}
                        </IconButton>
                        <SpeechRecognitionButton
                          isListening={isListening}
                          onStart={startListening}
                          onStop={stopListening}
                          disabled={isStreaming}
                        />
                        {chatStarted && <ClientOnly>{() => <ExportChatButton exportChat={exportChat} />}</ClientOnly>}
                        <IconButton
                          title="Model Settings"
                          className={classNames('transition-all flex items-center gap-1', {
                            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent':
                              isModelSettingsCollapsed,
                            'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault':
                              !isModelSettingsCollapsed,
                          })}
                          onClick={() => setIsModelSettingsCollapsed(!isModelSettingsCollapsed)}
                          disabled={!providerList || providerList.length === 0}
                        >
                          <div className={`i-ph:caret-${isModelSettingsCollapsed ? (document.documentElement.dir === 'rtl' ? 'left' : 'right') : 'down'} text-lg`} />
                          {isModelSettingsCollapsed ? <span className="text-xs sm:text-sm">{model}</span> : <span />}
                        </IconButton>
                      </div>
                      {input.length > 3 ? (
                        <div className="text-xs sm:text-sm text-bolt-elements-textTertiary">
                          Use <kbd className="kdb px-1 py-0.5 sm:px-1.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd>{' '}
                          + <kbd className="kdb px-1 py-0.5 sm:px-1.5 rounded bg-bolt-elements-background-depth-2">Return</kbd>{' '}
                          a new line
                        </div>
                      ) : null}
                      <SupabaseConnection />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:gap-5 p-2"> {/* Adjusted gap for mobile */}
              {!chatStarted && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-2"> {/* Allow wrapping for buttons */}
                  {ImportButtons(importChat)}
                  <GitCloneButton importChat={importChat} />
                </div>
              )}
              {!chatStarted &&
                ExamplePrompts((event, messageInput) => {
                  if (isStreaming) {
                    handleStop?.();
                    return;
                  }
                  handleSendMessage?.(event, messageInput);
                })}
              {!chatStarted && <StarterTemplates />}
            </div>
          </div>
          {/* Workbench Area: Takes remaining space on sm+ screens, full width on mobile (rendered below chat) */}
          <ClientOnly>
            {() => (
              <React.Suspense fallback={<div className="flex-1 p-4 text-center text-bolt-elements-textSecondary">Loading Workbench...</div>}>
                {/* Ensure Workbench itself is responsive or hidden on very small screens if necessary */}
                <div className="w-full h-full flex-1"> {/* Added flex-1 to allow workbench to take space */}
                  <Workbench
                    actionRunner={actionRunner ?? ({} as ActionRunner)}
                    chatStarted={chatStarted}
                    isStreaming={isStreaming}
                  />
                </div>
              </React.Suspense>
            )}
          </ClientOnly>
        </div>
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);
