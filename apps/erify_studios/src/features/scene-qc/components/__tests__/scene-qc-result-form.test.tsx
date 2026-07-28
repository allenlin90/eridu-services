import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SceneQcResultForm } from '../scene-qc-result-form';

describe('sceneQcResultForm', () => {
  it('has no feedback textarea for PASS (not yet selected)', () => {
    render(
      <SceneQcResultForm
        result={null}
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        feedbackRequired={false}
        feedbackMissing={false}
        canSave={false}
        isSaving={false}
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Feedback')).not.toBeInTheDocument();
  });

  it('shows the required feedback textarea and a validation message when Minor is selected with no feedback', () => {
    render(
      <SceneQcResultForm
        result="MINOR"
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        feedbackRequired
        feedbackMissing
        canSave={false}
        isSaving={false}
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Feedback')).toBeInTheDocument();
    expect(screen.getByText(/Feedback is required for Minor and Fail results/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save & next/i })).toBeDisabled();
  });

  it('clicking a result option calls onResultChange', async () => {
    const user = userEvent.setup();
    const onResultChange = vi.fn();
    render(
      <SceneQcResultForm
        result={null}
        onResultChange={onResultChange}
        feedback=""
        onFeedbackChange={vi.fn()}
        feedbackRequired={false}
        feedbackMissing={false}
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
        result={null}
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        feedbackRequired={false}
        feedbackMissing={false}
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
        result="PASS"
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        feedbackRequired={false}
        feedbackMissing={false}
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
        result="PASS"
        onResultChange={vi.fn()}
        feedback=""
        onFeedbackChange={vi.fn()}
        feedbackRequired={false}
        feedbackMissing={false}
        canSave
        isSaving
        onSave={vi.fn()}
        onSelectUnusableImage={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
  });
});
