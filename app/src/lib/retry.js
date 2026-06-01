/**
 * Exponential backoff retry utility with jitter.
 * Production-grade: configurable retries, timeout.
 */

export class RetryError extends Error {
  constructor(message, attempts, lastError) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Retries an async function with exponential backoff and optional jitter.
 *
 * @example
 * ```js
 * const result = await withRetry(() => addDoc(ref, data), { maxRetries: 3 });
 * ```
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 300,
    maxDelay = 10_000,
    signal,
    jitter = true,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check abort before each attempt
    if (signal?.aborted) {
      throw new DOMException('Retry aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // Don't retry on permission errors — they won't succeed
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'permission-denied' ||
         error.code === 'unauthenticated')
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: baseDelay * 2^attempt
        let delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

        // Add jitter: ±25% randomization
        if (jitter) {
          delay = delay * (0.75 + Math.random() * 0.5);
        }

        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);

          // Allow abort during wait
          if (signal) {
            const onAbort = () => {
              clearTimeout(timer);
              reject(new DOMException('Retry aborted', 'AbortError'));
            };
            signal.addEventListener('abort', onAbort, { once: true });
          }
        });
      }
    }
  }

  throw new RetryError(
    `Operation failed after ${maxRetries + 1} attempts`,
    maxRetries + 1,
    lastError
  );
}
