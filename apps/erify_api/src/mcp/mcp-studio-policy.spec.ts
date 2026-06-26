import { HttpException, HttpStatus } from '@nestjs/common';

import { McpStudioPolicy } from './mcp-studio-policy';

describe('mcpStudioPolicy', () => {
  it('allows every studio when no allowlist is configured', () => {
    const policy = new McpStudioPolicy('');

    expect(policy.assertStudioAllowed('std_123')).toBe('std_123');
  });

  it('allows a studio that appears in the comma-separated allowlist', () => {
    const policy = new McpStudioPolicy('std_123, std_456');

    expect(policy.assertStudioAllowed('std_456')).toBe('std_456');
  });

  it('rejects a studio outside the configured allowlist', () => {
    const policy = new McpStudioPolicy('std_123');

    expect(() => policy.assertStudioAllowed('std_999')).toThrow(HttpException);

    try {
      policy.assertStudioAllowed('std_999');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as HttpException).message).toBe('Studio is not enabled for MCP access');
    }
  });

  it('rejects studio identifiers with the wrong prefix', () => {
    const policy = new McpStudioPolicy('');

    expect(() => policy.assertStudioAllowed('show_123')).toThrow(HttpException);
  });
});
