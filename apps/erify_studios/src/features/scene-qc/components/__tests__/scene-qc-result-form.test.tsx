import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SceneQcResultForm } from '../scene-qc-result-form';

const SHARED_PROPS = {
  studioId: 'std_test',
  findings: [],
  onFindingsChange: vi.fn(),
  findingsMissing: false,
  taxonomy: undefined,
  sceneType: 'GRAPHIC_BG' as const,
};

describe('sceneQcResultForm', () => {
  it('always offers an optional note', () => {
    render(
      <SceneQcResultForm
        {...SHARED_PROPS}
        result={null}
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        canSave={false}
        isSaving={false}
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Optional note')).toBeInTheDocument();
  });

  it('shows structured issue validation when Minor is selected without findings', () => {
    render(
      <SceneQcResultForm
        {...SHARED_PROPS}
        result="MINOR"
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        findingsMissing
        canSave={false}
        isSaving={false}
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );
    expect(screen.getByText(/Add at least one issue for Minor and Fail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save & next/i })).toBeDisabled();
  });

  it('clicking a result option calls onResultChange', async () => {
    const user = userEvent.setup();
    const onResultChange = vi.fn();
    render(
      <SceneQcResultForm
        {...SHARED_PROPS}
        result={null}
        onResultChange={onResultChange}
        feedback=""
        onFeedbackChange={vi.fn()}
        canSave={false}
        isSaving={false}
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fail' }));
    expect(onResultChange).toHaveBeenCalledWith('FAIL');
  });

  it('the unusable-image shortcut calls onSelectUnusableImage and never calls onSave', async () => {
    const user = userEvent.setup();
    const onSelectUnusableImage = vi.fn();
    const onSave = vi.fn();
    render(
      <SceneQcResultForm
        {...SHARED_PROPS}
        result={null}
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        canSave={false}
        isSaving={false}
        onSave={onSave}
        onSelectUnusableImage={onSelectUnusableImage}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Image blank or not viewable/i }));
    expect(onSelectUnusableImage).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('save & next is enabled once canSave is true and calls onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SceneQcResultForm
        {...SHARED_PROPS}
        result="PASS"
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        canSave
        isSaving={false}
        onSave={onSave}
        onSelectUnusableImage={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: /Save & next/i });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables Save & next and shows a pending label while saving', () => {
    render(
      <SceneQcResultForm
        {...SHARED_PROPS}
        result="PASS"
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        canSave
        isSaving
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
  });
});
