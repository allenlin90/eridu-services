import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { getShowRunReviewErrorMessage } from '../get-show-run-review-error-message';

function axiosErrorWith(data: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('getShowRunReviewErrorMessage', () => {
  it('surfaces the validation issue message over the generic top-level label', () => {
    const error = axiosErrorWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ path: 'date_to', code: 'custom', message: 'Date range must not exceed 31 days' }],
    });

    expect(getShowRunReviewErrorMessage(error)).toBe('Date range must not exceed 31 days');
  });

  it('joins multiple issue messages', () => {
    const error = axiosErrorWith({
      message: 'Validation failed',
      errors: [{ message: 'First issue.' }, { message: 'Second issue.' }],
    });

    expect(getShowRunReviewErrorMessage(error)).toBe('First issue. Second issue.');
  });

  it('falls back to a specific top-level message when there are no issues', () => {
    const error = axiosErrorWith({ message: 'Studio not found with id std_x' });

    expect(getShowRunReviewErrorMessage(error)).toBe('Studio not found with id std_x');
  });

  it('ignores the generic "Validation failed" label with no usable issues', () => {
    const error = axiosErrorWith({ message: 'Validation failed', errors: [] });

    expect(getShowRunReviewErrorMessage(error)).toBe(
      'Failed to load show run review summary. Please try again.',
    );
  });

  it('returns the default message for non-axios errors', () => {
    expect(getShowRunReviewErrorMessage(new Error('boom'))).toBe(
      'Failed to load show run review summary. Please try again.',
    );
  });
});
