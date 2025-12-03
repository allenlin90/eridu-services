/* eslint-disable  */
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Interface for guards that can be tested
 */
type TestableGuard = {
  canActivate: (context: ExecutionContext) => boolean | Promise<boolean>;
} & CanActivate;

/**
 * Mock ExecutionContext factory for guard testing
 */
export type MockExecutionContextOptions = {
  /** Request object or overrides */
  request?: Partial<Request>;
  /** Response object or overrides */
  response?: Partial<Response>;
  /** HTTP method (default: 'GET') */
  method?: string;
  /** Request URL (default: '/test') */
  url?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Request params */
  params?: Record<string, string>;
  /** Request query */
  query?: Record<string, string>;
  /** Request user (for authenticated requests) */
  user?: any;
};

/**
 * Creates a mock ExecutionContext for guard testing.
 *
 * @param options - Configuration options for the mock context
 * @returns A properly mocked ExecutionContext
 *
 * @example
 * ```typescript
 * const context = createMockExecutionContext({
 *   method: 'POST',
 *   url: '/api/users',
 *   headers: { 'authorization': 'Bearer token' },
 *   user: mockUser,
 * });
 *
 * const canActivate = guard.canActivate(context);
 * ```
 */
export function createMockExecutionContext(
  options: MockExecutionContextOptions = {},
): ExecutionContext {
  const {
    request: requestOverrides = {},
    response: responseOverrides = {},
    method = 'GET',
    url = '/test',
    headers = {},
    body,
    params = {},
    query = {},
    user,
  } = options;

  const mockRequest = {
    method,
    url,
    headers,
    body,
    params,
    query,
    user,
    ...requestOverrides,
  } as Partial<Request>;

  const mockResponse = {
    ...responseOverrides,
  } as Partial<Response>;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;

  return mockExecutionContext;
}

/**
 * Creates a mock request object for testing.
 *
 * @param options - Request configuration options
 * @returns A mock Request object
 *
 * @example
 * ```typescript
 * const request = createMockRequest({
 *   headers: { 'x-api-key': 'test-key' },
 *   body: { name: 'test' },
 * });
 * ```
 */
export function createMockRequest(
  options: Omit<MockExecutionContextOptions, 'response'> = {},
): Request {
  const context = createMockExecutionContext(options);
  return context.switchToHttp().getRequest();
}

/**
 * Creates a mock response object for testing.
 *
 * @param options - Response configuration options
 * @returns A mock Response object
 */
export function createMockResponse(
  options: { response?: Partial<Response> } = {},
): Response {
  const context = createMockExecutionContext({ response: options.response });
  return context.switchToHttp().getResponse();
}

/**
 * Common test patterns for guard testing
 */
export const guardTestPatterns = {
  /**
   * Test that a guard allows access with valid credentials
   */
  shouldAllowAccess: (
    guard: TestableGuard,
    context: ExecutionContext,
    description = 'should allow access',
  ) => {
    it(description, () => {
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  },

  /**
   * Test that a guard denies access with invalid credentials
   */
  shouldDenyAccess: (
    guard: TestableGuard,
    context: ExecutionContext,
    description = 'should deny access',
  ) => {
    it(description, () => {
      expect(() => guard.canActivate(context)).toThrow();
    });
  },

  /**
   * Test that a guard denies access and returns false
   */
  shouldReturnFalse: (
    guard: TestableGuard,
    context: ExecutionContext,
    description = 'should return false',
  ) => {
    it(description, () => {
      const result = guard.canActivate(context);
      expect(result).toBe(false);
    });
  },

  /**
   * Test guard with missing header
   */
  shouldRejectMissingHeader: (guard: TestableGuard, headerName: string) => {
    it(`should reject when ${headerName} header is missing`, () => {
      const context = createMockExecutionContext({
        headers: {
          /* missing header */
        },
      });
      expect(() => guard.canActivate(context)).toThrow();
    });
  },

  /**
   * Test guard with invalid header value
   */
  shouldRejectInvalidHeader: (
    guard: TestableGuard,
    headerName: string,
    invalidValue: string,
  ) => {
    it(`should reject when ${headerName} header has invalid value`, () => {
      const context = createMockExecutionContext({
        headers: { [headerName]: invalidValue },
      });
      expect(() => guard.canActivate(context)).toThrow();
    });
  },

  /**
   * Test guard with valid header
   */
  shouldAllowValidHeader: (
    guard: TestableGuard,
    headerName: string,
    validValue: string,
  ) => {
    it(`should allow when ${headerName} header is valid`, () => {
      const context = createMockExecutionContext({
        headers: { [headerName]: validValue },
      });
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  },
};

/**
 * Helper to test guards that throw exceptions
 */
export function expectGuardToThrow(
  guard: TestableGuard,
  context: ExecutionContext,
  expectedError?: Error | string,
) {
  if (expectedError) {
    expect(() => guard.canActivate(context)).toThrow(expectedError);
  }
  else {
    expect(() => guard.canActivate(context)).toThrow();
  }
}

/**
 * Helper to test guards that return boolean
 */
export function expectGuardToReturn(
  guard: TestableGuard,
  context: ExecutionContext,
  expectedResult: boolean,
) {
  const result = guard.canActivate(context);
  expect(result).toBe(expectedResult);
}
