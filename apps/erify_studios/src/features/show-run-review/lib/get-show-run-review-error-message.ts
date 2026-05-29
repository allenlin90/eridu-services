import axios from 'axios';

type ApiValidationIssue = { message?: unknown };
type ApiErrorBody = { message?: unknown; errors?: ApiValidationIssue[] };

const DEFAULT_MESSAGE = 'Failed to load show run review summary. Please try again.';

/**
 * Surfaces the most specific message from a failed run-review request.
 * Backend validation errors (e.g. the date-range limit) carry their detail in
 * `errors[].message`; the top-level `message` is only a generic label.
 */
export function getShowRunReviewErrorMessage(error: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;

    const issueMessage = data?.errors
      ?.map((issue) => issue.message)
      .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
      .join(' ');
    if (issueMessage) {
      return issueMessage;
    }

    const topLevel = data?.message;
    if (typeof topLevel === 'string' && topLevel.trim().length > 0 && topLevel !== 'Validation failed') {
      return topLevel;
    }
  }

  return fallback;
}
