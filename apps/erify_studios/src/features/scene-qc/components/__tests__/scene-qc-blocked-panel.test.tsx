import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SceneQcBlockedPanel } from '../scene-qc-blocked-panel';

describe('sceneQcBlockedPanel', () => {
  it('names the missing upstream evidence requirement and renders no Pass/Minor/Fail controls', () => {
    render(<SceneQcBlockedPanel />);

    expect(screen.getByText(/No Scene QC evidence yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Task Template/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pass' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fail' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
  });
});
