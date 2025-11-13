import { useState, useCallback } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RetryState {
  isLoading: boolean;
  error: Error | null;
  attempts: number;
}

/**
 * Hook pour retry automatique avec exponential backoff
 *
 * @param options - Options de configuration du retry
 * @returns { execute, ...state }
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error, attempts } = useRetry({
 *   maxAttempts: 3,
 *   initialDelay: 1000,
 *   onRetry: (attempt, error) => {
 *     console.log(`Tentative ${attempt} après erreur:`, error);
 *   }
 * });
 *
 * const fetchData = async () => {
 *   const data = await execute(async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Failed to fetch');
 *     return response.json();
 *   });
 *   return data;
 * };
 * ```
 */
export function useRetry(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  const [state, setState] = useState<RetryState>({
    isLoading: false,
    error: null,
    attempts: 0,
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number): number => {
    const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  };

  const execute = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setState({ isLoading: true, error: null, attempts: 0 });

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setState(prev => ({ ...prev, attempts: attempt }));
          const result = await fn();
          setState({ isLoading: false, error: null, attempts: attempt });
          return result;
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxAttempts) {
            // On n'a pas encore atteint le nombre max de tentatives
            const delay = calculateDelay(attempt);
            onRetry?.(attempt, lastError);
            await sleep(delay);
          }
        }
      }

      // Toutes les tentatives ont échoué
      setState({
        isLoading: false,
        error: lastError,
        attempts: maxAttempts,
      });

      throw lastError;
    },
    [maxAttempts, initialDelay, maxDelay, backoffMultiplier, onRetry]
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, attempts: 0 });
  }, []);

  return {
    execute,
    reset,
    ...state,
  };
}

/**
 * Utilitaire pour retry une fonction avec exponential backoff
 * Version non-hook, utilisable n'importe où
 *
 * @example
 * ```ts
 * const data = await retryWithBackoff(
 *   async () => {
 *     const res = await fetch('/api/data');
 *     if (!res.ok) throw new Error('Failed');
 *     return res.json();
 *   },
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number): number => {
    const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = calculateDelay(attempt);
        onRetry?.(attempt, lastError);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
