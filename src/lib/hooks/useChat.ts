'use client';

import { useState, useCallback } from 'react';
import { getChatCompletion, getStreamingChatCompletion } from '@/lib/ai/chatCompletion';

export type GeminiErrorType = 'quota' | 'network' | 'timeout' | 'invalid_response' | 'api_key' | 'unknown';

export interface GeminiError {
  type: GeminiErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
}

function classifyError(err: unknown): GeminiError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('quota') || lower.includes('429') || lower.includes('rate limit')) {
    return {
      type: 'quota',
      message: msg,
      userMessage: 'Limite de requisições atingido. Aguarde alguns instantes e tente novamente.',
      retryable: true,
    };
  }
  if (lower.includes('api key') || lower.includes('401') || lower.includes('unauthorized') || lower.includes('not configured')) {
    return {
      type: 'api_key',
      message: msg,
      userMessage: 'Chave de API não configurada ou inválida. Verifique as configurações.',
      retryable: false,
    };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
    return {
      type: 'timeout',
      message: msg,
      userMessage: 'A requisição demorou muito. Tente novamente com um prompt menor.',
      retryable: true,
    };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection') || lower.includes('econnrefused')) {
    return {
      type: 'network',
      message: msg,
      userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
      retryable: true,
    };
  }
  if (lower.includes('invalid') || lower.includes('parse') || lower.includes('json') || lower.includes('500')) {
    return {
      type: 'invalid_response',
      message: msg,
      userMessage: 'Resposta inválida da IA. Tente novamente.',
      retryable: true,
    };
  }
  return {
    type: 'unknown',
    message: msg,
    userMessage: 'Erro inesperado ao conectar com a IA. Tente novamente.',
    retryable: true,
  };
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChat(provider: string, model: string, streaming: boolean = true) {
  const [response, setResponse] = useState('');
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeminiError | null>(null);

  const sendMessage = useCallback(
    async (messages: object[], parameters: object = {}) => {
      setResponse('');
      setFullResponse(streaming ? [] : null);
      setIsLoading(true);
      setError(null);

      let lastError: GeminiError | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await sleep(RETRY_DELAY_MS * attempt);
          }

          if (streaming) {
            await getStreamingChatCompletion(
              provider,
              model,
              messages,
              (chunk) => {
                setFullResponse((prev: any[]) => [...(prev || []), chunk]);
                const content = chunk?.choices?.[0]?.delta?.content;
                if (content) setResponse((prev) => prev + content);
              },
              () => {
                setIsLoading(false);
                lastError = null;
              },
              (err) => {
                lastError = classifyError(err);
              },
              parameters
            );
            // If streaming completed without error, break
            if (!lastError) break;
            // If not retryable, break immediately
            if (!lastError.retryable) break;
          } else {
            const result = await getChatCompletion(provider, model, messages, parameters);

            // Check for API-level error in response body
            if (result?.error) {
              throw new Error(result.error + (result.details ? `: ${result.details}` : ''));
            }

            const content = result?.choices?.[0]?.message?.content;
            if (!content && attempt < MAX_RETRIES) {
              throw new Error('invalid_response: empty content');
            }

            setFullResponse(result);
            setResponse(content || '');
            setIsLoading(false);
            lastError = null;
            break;
          }
        } catch (err) {
          lastError = classifyError(err);
          if (!lastError.retryable || attempt === MAX_RETRIES) break;
        }
      }

      if (lastError) {
        setError(lastError);
        setIsLoading(false);
        console.error('[Gemini Error]', lastError.type, lastError.message);
      }
    },
    [provider, model, streaming]
  );

  const clearError = useCallback(() => setError(null), []);

  return { response, fullResponse, isLoading, error, sendMessage, clearError };
}
