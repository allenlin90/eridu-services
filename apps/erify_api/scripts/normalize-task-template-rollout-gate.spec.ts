import { getNormalizationExitCode } from './normalize-task-template-rollout-gate';

describe('normalize-task-template rollout gate', () => {
  it('keeps a successful exit code when no templates are invalid', () => {
    expect(getNormalizationExitCode({ invalid: 0 })).toBe(0);
  });

  it('fails the command when any template is invalid', () => {
    expect(getNormalizationExitCode({ invalid: 1 })).toBe(1);
  });
});
