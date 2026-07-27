import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SceneQcEvidenceToggle } from '../scene-qc-evidence-toggle';

describe('sceneQcEvidenceToggle', () => {
  it('renders unchecked and enabled by default', () => {
    render(<SceneQcEvidenceToggle id="t1" checked={false} onChange={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeEnabled();
  });

  it('calls onChange(true) when toggled on', () => {
    const onChange = vi.fn();
    render(<SceneQcEvidenceToggle id="t1" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders disabled with the provided reason text when disabled', () => {
    render(
      <SceneQcEvidenceToggle
        id="t1"
        checked={false}
        disabled
        disabledReason="Mechanic fields cannot be Scene QC evidence."
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByText('Mechanic fields cannot be Scene QC evidence.')).toBeInTheDocument();
  });

  it('does not render a disabled reason when enabled', () => {
    render(<SceneQcEvidenceToggle id="t1" checked={false} onChange={vi.fn()} disabledReason="should not show" />);

    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });
});
