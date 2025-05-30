import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo, AIStreamChunk } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import { createOpenAI, type OpenAIProvider as AIOPENAIProvider } from '@ai-sdk/openai';
import type { LanguageModelV1, LanguageModelV1StreamPart } from 'ai';
import { AIError, type PromptOptions, type ReadStream } from 'ai';
import { type Env } from '~/types/env'; // Updated import path
import { logger } from '~/utils/logger';

// Helper to transform the AI SDK stream to the project's expected AIStreamChunk format
async function* readableStreamToAIStreamChunk(
  stream: ReadStream<LanguageModelV1StreamPart>,
): AsyncGenerator<AIStreamChunk> {
  for await (const part of stream) {
    if (part.type === 'text-delta') {
      yield { text: part.textDelta };
    } else if (part.type === 'tool-call') {
      // Handle tool calls if necessary in the future
      // For now, we primarily expect text deltas for chat
    } else if (part.type === 'finish') {
      // Handle finish if there's specific metadata to pass
      // console.log('Stream finished:', part.finishReason, part.usage);
    } else if (part.type === 'error') {
      logger.error('Error in LLaMA.cpp stream:', part.error);
      throw new AIError(part.error.message, part.error);
    }
  }
}

export class LlamaCppProvider extends BaseProvider {
  // Default LLaMA.cpp server URL. This could be made configurable through settings later.
  private DEFAULT_LLAMACPP_BASE_URL = 'http://localhost:8080';

  constructor() {
    // providerId, displayName, providerType
    super('llamacpp', 'LLaMA.cpp (Local)', 'local');
  }

  // Configuration for the provider, similar to LMStudioProvider
  // These keys would be used if we allow users to override the default URL in settings
  config = {
    baseUrlKey: 'LLAMACPP_API_BASE_URL', // Environment variable to override the base URL
    baseUrl: this.DEFAULT_LLAMACPP_BASE_URL,
  };

  /**
   * Defines static models available through this provider.
   * For LLaMA.cpp, users typically load one model at a time.
   * This entry represents that currently loaded model.
   */
  get staticModels(): ModelInfo[] {
    return [
      {
        id: 'llamacpp-loaded-model', // A generic ID, as the actual model name isn't known beforehand
        name: 'LLaMA.cpp Model', // User-friendly name
        provider: this.name, // 'llamacpp'
        type: 'chat',
        contextWindow: 4096, // Example, can be adjusted or made configurable
        status: 'beta',
        inputModalities: ['text'],
        outputModalities: ['text'],
        description: 'The model currently loaded in your local LLaMA.cpp server.',
        pricing: {
          prompt: '0',
          completion: '0',
        },
        isDefault: true,
      },
    ];
  }

  /**
   * LLaMA.cpp doesn't have a standard endpoint to list all possible models dynamically
   * like some hosted services. It typically serves one loaded model.
   * So, we rely on staticModels.
   */
  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    // Could potentially try to hit an info endpoint on LLaMA.cpp server if one exists
    // to get the name of the currently loaded model and update staticModels,
    // but for now, returning empty is fine as staticModels provides a generic entry.
    return Promise.resolve([]);
  }

  private getModelInstance(options: {
    modelId: string; // The model ID from staticModels or dynamicModels
    serverEnv?: Env;
    apiKeys?: Record<string, string>; // Not used by LLaMA.cpp typically
    providerSettings?: IProviderSetting;
  }): LanguageModelV1 {
    const { providerSettings, serverEnv } = options;

    // Get the base URL, allowing for overrides from environment or settings
    let { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys: {}, // LLaMA.cpp usually doesn't need an API key
      providerSettings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: this.config.baseUrlKey,
      defaultApiTokenKey: '', // No API token key for LLaMA.cpp
    });

    if (!baseUrl) {
      baseUrl = this.DEFAULT_LLAMACPP_BASE_URL; // Fallback to hardcoded default
      logger.warn(`Base URL for LlamaCppProvider not found in settings or env, using default: ${baseUrl}`);
    }


    // Handle Docker environment like LMStudioProvider does
    if (typeof window === 'undefined') { // Running in Server/Backend
      const isDocker = process?.env?.RUNNING_IN_DOCKER === 'true' || serverEnv?.RUNNING_IN_DOCKER === 'true';
      if (isDocker) {
        baseUrl = baseUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
      }
    }

    logger.debug(`LLaMA.cpp Provider using base URL: ${baseUrl}`);

    // LLaMA.cpp's OpenAI-compatible endpoint usually doesn't require an API key.
    // The createOpenAI factory is flexible.
    const llamacpp = createOpenAI({
      baseURL: baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`, // Ensure /v1 path
      apiKey: 'sk-no-key-required', // Dummy API key, as it's often not needed for local LLaMA.cpp
      // We can add headers here if LLaMA.cpp server requires specific headers
    });

    // The modelId from staticModels ('llamacpp-loaded-model') might not be what LLaMA.cpp server expects.
    // LLaMA.cpp usually serves one model, and the '/v1/chat/completions' endpoint uses that loaded model.
    // The 'model' field in the OpenAI request body to LLaMA.cpp might be ignored or used to specify
    // the served model if it knows multiple. For now, pass a generic or the static ID.
    // It's often derived from the GGUF filename on the server.
    // For robustness, users might need to configure this if their LLaMA.cpp setup uses specific model names.
    // For now, let's use the ID from our staticModels.
    return llamacpp(options.modelId);
  }

  /**
   * Implements the chat streaming logic by calling the LLaMA.cpp server.
   */
  async getChatStream(
    messages: Message[],
    options: PromptOptions,
    settings?: IProviderSetting, // Per-provider instance settings
    serverEnv?: Env, // Server-side environment variables
  ): Promise<AsyncGenerator<AIStreamChunk>> {
    const modelId = options.modelId || this.staticModels[0]?.id || 'llamacpp-loaded-model';

    const modelInstance = this.getModelInstance({
      modelId,
      serverEnv,
      providerSettings: settings,
    });

    try {
      // @ts-expect-error - AISDK and our Message type might have slight differences.
      // Need to ensure the 'messages' conform to what modelInstance.doStream expects.
      // Typically, this involves mapping our Message[] to the SDK's expected format if different.
      // Assuming direct compatibility or that BaseProvider handles mapping for now.
      const stream = await modelInstance.doStream({
        messages: messages, // Ensure this matches the type expected by doStream
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        // seed: options.seed, // if supported
        // stopSequences: options.stop, // if supported
        // frequencyPenalty: options.frequencyPenalty, // if supported
        // presencePenalty: options.presencePenalty, // if supported
        stream: true,
      });

      return readableStreamToAIStreamChunk(stream);
    } catch (error: any) {
      logger.error('Error fetching LLaMA.cpp stream:', error);
      // Transform to AIError or a project-specific error type if needed
      throw new AIError(
        `LLaMA.cpp API error: ${error.message || 'Failed to fetch stream'}`,
        error.cause || error,
      );
    }
  }
}
