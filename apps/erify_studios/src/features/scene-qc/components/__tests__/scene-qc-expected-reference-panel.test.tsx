import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SceneQcExpectedReferencePanel } from '../scene-qc-expected-reference-panel';

describe('sceneQcExpectedReferencePanel', () => {
  it('renders a missing-profile warning above an empty panel when sceneProfile is null', () => {
    render(<SceneQcExpectedReferencePanel sceneProfile={null} />);

    expect(screen.getByText(/No Scene Profile set for this Client/i)).toBeInTheDocument();
    expect(screen.getByText(/No expected reference image/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the expected reference image and scene type label when a profile exists', () => {
    render(
      <SceneQcExpectedReferencePanel
        sceneProfile={{ object_key: 'k', file_url: 'https://cdn.example.com/k.png', scene_type: 'REAL_BACKDROP' }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Expected scene reference' })).toHaveAttribute('src', 'https://cdn.example.com/k.png');
    expect(screen.getByText('Real Backdrop')).toBeInTheDocument();
    expect(screen.queryByText(/No Scene Profile set/i)).not.toBeInTheDocument();
  });
});
