import axios from 'axios';

/**
 * Extracts a user-facing error message from a mutation error.
 * Optionally maps known backend error codes to friendly messages.
 */
export function getMutationErrorMessage(
  error: unknown,
  fallback: string,
  messageMap?: Record<string, string>,
): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return messageMap?.[message] ?? message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
