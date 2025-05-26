import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting, ProviderInfo } from '~/types/model';
import { generateText } from 'ai';
import { PROVIDER_LIST } from '~/utils/constants';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';

export async function action(args: ActionFunctionArgs) {
  return llmCallAction(args);
}

const LOCAL_LLAMA_URL = process.env.LOCAL_LLAMA_URL; // Read from environment
const LOCAL_LLAMA_TIMEOUT = 10000; // 10 seconds for local server timeout

async function getModelList(options: {
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  serverEnv?: Record<string, string>;
}) {
  const llmManager = LLMManager.getInstance(import.meta.env);
  return llmManager.updateModelList(options);
}

const logger = createScopedLogger('api.llmcall');

async function llmCallAction({ context, request }: ActionFunctionArgs) {
  const requestBody = await request.json<{
    system: string;
    message: string;
    model: string;
    provider: ProviderInfo;
    streamOutput?: boolean;
    // Add other potential parameters like temperature, max_tokens if client might send them
    temperature?: number;
    max_tokens?: number;
  }>();

  const { system, message, model, provider, streamOutput, temperature, max_tokens } = requestBody;

  const isOfflineMode = request.headers.get('X-Offline-Mode') === 'true';

  if (isOfflineMode && LOCAL_LLAMA_URL) {
    logger.info(`Offline mode: Attempting to use local LLaMA server at ${LOCAL_LLAMA_URL}`);
    try {
      const llamaPayload: Record<string, any> = {
        messages: [
          // llama.cpp OpenAI API typically prefers system message first if provided
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: message }
        ],
        stream: !!streamOutput, // Ensure boolean
      };

      if (temperature !== undefined) llamaPayload.temperature = temperature;
      // llama.cpp's /v1/chat/completions uses 'n_predict' for max_tokens,
      // or you might need to map 'max_tokens' if your llama.cpp build supports it directly.
      // For simplicity, we'll pass max_tokens if the server supports it by that name.
      if (max_tokens !== undefined) llamaPayload.max_tokens = max_tokens;
      // If llama.cpp expects n_predict, you would do:
      // if (max_tokens !== undefined) llamaPayload.n_predict = max_tokens;


      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LOCAL_LLAMA_TIMEOUT);

      const response = await fetch(LOCAL_LLAMA_URL + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if your llama.cpp server requires it
          // 'Authorization': `Bearer YOUR_LOCAL_API_KEY` 
        },
        body: JSON.stringify(llamaPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`Local LLaMA server request failed with status ${response.status}: ${errorBody}`);
        throw new Response(JSON.stringify({ error: "Local LLaMA server request failed.", details: errorBody }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      logger.info(`Successfully received response from local LLaMA server.`);

      if (streamOutput && response.body) {
        return new Response(response.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8', // Common for OpenAI streaming
          },
        });
      } else {
        const jsonResponse = await response.json();
        return new Response(JSON.stringify(jsonResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error: any) {
      logger.error('Error during local LLaMA fallback:', error);
      if (error.name === 'AbortError') {
        return new Response(JSON.stringify({ error: "Local LLaMA server request timed out." }), {
          status: 504, // Gateway Timeout
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Check if error is already a Response object (thrown from !response.ok block)
      if (error instanceof Response) {
        return error;
      }
      return new Response(JSON.stringify({ error: "Local LLaMA server unavailable or an unexpected error occurred.", details: error.message }), {
        status: 503, // Service Unavailable
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else if (isOfflineMode && !LOCAL_LLAMA_URL) {
    logger.warn('Offline mode active, but LOCAL_LLAMA_URL is not configured.');
    return new Response(JSON.stringify({ error: "Offline mode is active, but the local LLaMA server is not configured." }), {
      status: 501, // Not Implemented (or 400 Bad Request)
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Existing Online Provider Logic Starts Here ---
  logger.info('Online mode: Proceeding with standard LLM providers.');
  const { name: providerName } = provider;

  // validate 'model' and 'provider' fields
  if (!model || typeof model !== 'string') {
    throw new Response('Invalid or missing model', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  if (!providerName || typeof providerName !== 'string') {
    throw new Response('Invalid or missing provider', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  if (streamOutput) {
    try {
      const result = await streamText({
        options: {
          system,
        },
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        env: context.cloudflare?.env as any,
        apiKeys,
        providerSettings,
      });

      return new Response(result.textStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      if (error instanceof Error && error.message?.includes('API key')) {
        throw new Response('Invalid or missing API key', {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      throw new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  } else {
    try {
      const models = await getModelList({ apiKeys, providerSettings, serverEnv: context.cloudflare?.env as any });
      const modelDetails = models.find((m: ModelInfo) => m.name === model);

      if (!modelDetails) {
        throw new Error('Model not found');
      }

      const dynamicMaxTokens = modelDetails && modelDetails.maxTokenAllowed ? modelDetails.maxTokenAllowed : MAX_TOKENS;

      const providerInfo = PROVIDER_LIST.find((p) => p.name === provider.name);

      if (!providerInfo) {
        throw new Error('Provider not found');
      }

      logger.info(`Generating response Provider: ${provider.name}, Model: ${modelDetails.name}`);

      const result = await generateText({
        system,
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        model: providerInfo.getModelInstance({
          model: modelDetails.name,
          serverEnv: context.cloudflare?.env as any,
          apiKeys,
          providerSettings,
        }),
        maxTokens: dynamicMaxTokens,
        toolChoice: 'none',
      });
      logger.info(`Generated response`);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      if (error instanceof Error && error.message?.includes('API key')) {
        throw new Response('Invalid or missing API key', {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      throw new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  }
}
