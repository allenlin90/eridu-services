import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SceneQcImageFrame } from '../scene-qc-image-frame';

describe('sceneQcImageFrame', () => {
  it('renders the image by default', () => {
    render(<SceneQcImageFrame src="https://cdn.example.com/a.png" alt="Evidence" />);
    expect(screen.getByRole('img', { name: 'Evidence' })).toBeInTheDocument();
  });

  it('on a load failure, shows retry/open-original controls and never auto-submits or selects Fail', () => {
    render(<SceneQcImageFrame src="https://cdn.example.com/broken.png" alt="Evidence" />);

    fireEvent.error(screen.getByRole('img', { name: 'Evidence' }));

    expect(screen.getByText(/Could not load this image/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open original/i })).toHaveAttribute('href', 'https://cdn.example.com/broken.png');
    // No result/save control exists on this component at all -- the failure
    // cannot possibly auto-submit or auto-select Fail from here.
    expect(screen.queryByRole('button', { name: /Fail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
  });

  it('retry returns to the image element for another load attempt', async () => {
    const user = userEvent.setup();
    render(<SceneQcImageFrame src="https://cdn.example.com/broken.png" alt="Evidence" />);

    fireEvent.error(screen.getByRole('img', { name: 'Evidence' }));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByRole('img', { name: 'Evidence' })).toBeInTheDocument();
    expect(screen.queryByText(/Could not load this image/i)).not.toBeInTheDocument();
  });
});
