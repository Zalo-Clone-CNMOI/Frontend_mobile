export type ErrorContext = Record<string, unknown>;

export interface NormalizedError {
  message: string;
  stack?: string;
  cause?: unknown;
}

export const normalizeError = (error: unknown): NormalizedError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: 'Unknown error',
    cause: error,
  };
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  const normalizedError = normalizeError(error);
  return normalizedError.message || fallback;
};

export const logError = (
  scope: string,
  error: unknown,
  context?: ErrorContext,
): void => {
  const normalizedError = normalizeError(error);
  console.error(`[${scope}] ${normalizedError.message}`, {
    ...context,
    stack: normalizedError.stack,
    cause: normalizedError.cause,
  });
};
