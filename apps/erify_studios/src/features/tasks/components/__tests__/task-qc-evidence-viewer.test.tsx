import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TaskQcEvidenceViewer } from '../task-qc-evidence-viewer';

const evidence = [
  {
    key: 'wide',
    label: 'Wide scene',
    url: 'https://example.com/wide.jpg',
  },
  {
    key: 'close',
    label: 'Product close-up',
    url: 'https://example.com/close.jpg',
  },
];

describe('taskQcEvidenceViewer', () => {
  it('navigates screenshots and renders the layout QC overlay', async () => {
    const user = userEvent.setup();

    render(<TaskQcEvidenceViewer evidence={evidence} showLayoutQc />);

    expect(screen.getByRole('img', { name: 'Wide scene' })).toBeInTheDocument();
    expect(screen.getByLabelText('Layout QC overlay')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next screenshot' }));

    expect(screen.getByRole('img', { name: 'Product close-up' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('resets to the first screenshot when a different task is selected', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TaskQcEvidenceViewer evidence={evidence} showLayoutQc={false} />,
    );

    await user.click(screen.getByRole('button', { name: 'Next screenshot' }));
    expect(screen.getByRole('img', { name: 'Product close-up' })).toBeInTheDocument();

    rerender(
      <TaskQcEvidenceViewer
        evidence={[{
          key: 'new',
          label: 'New task scene',
          url: 'https://example.com/new.jpg',
        }]}
        showLayoutQc={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'New task scene' })).toBeInTheDocument();
    });
  });
});
