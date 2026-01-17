import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformIcon } from '../platform-icons';

describe('platformIcon', () => {
  it('renders TikTok icon with correct SVG', () => {
    const { container } = render(<PlatformIcon platform="tiktok" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders Shopee icon with orange color class', () => {
    const { container } = render(<PlatformIcon platform="shopee" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('fill-orange-500');
  });

  it('renders Lazada icon with blue color class', () => {
    const { container } = render(<PlatformIcon platform="lazada" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('fill-blue-600');
  });

  it('returns null for unknown platform', () => {
    const { container } = render(<PlatformIcon platform="unknown" />);
    expect(container.firstChild).toBeNull();
  });

  it('handles case-insensitive platform names', () => {
    const { container } = render(<PlatformIcon platform="TIKTOK" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles undefined platform gracefully', () => {
    const { container } = render(<PlatformIcon platform={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies correct size classes', () => {
    const { container } = render(<PlatformIcon platform="tiktok" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-3', 'w-3', 'mr-1');
  });
});
