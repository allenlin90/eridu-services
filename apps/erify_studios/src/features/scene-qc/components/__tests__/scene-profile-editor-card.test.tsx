import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SceneProfileApiResponse } from '@eridu/api-types/scene-qc';

import { SceneProfileEditorCard } from '../scene-profile-editor-card';

function makeProfile(overrides: Partial<SceneProfileApiResponse> = {}): SceneProfileApiResponse {
  return {
    id: 'scprof_1',
    client_id: 'client_xyz',
    object_key: 'scene_reference/x/y.png',
    file_url: 'https://cdn.example.com/scene_reference/x/y.png',
    mime_type: 'image/png',
    file_size: 100,
    scene_type: 'GRAPHIC_BG',
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    profile: makeProfile(),
    sceneType: 'GRAPHIC_BG' as const,
    onSceneTypeChange: vi.fn(),
    selectedFile: null,
    onSelectFile: vi.fn(),
    onSave: vi.fn(),
    onRetire: vi.fn(),
    isUploading: false,
    isSaving: false,
    isRetiring: false,
    canSave: false,
    uploadError: null,
    ...overrides,
  };
}

describe('sceneProfileEditorCard', () => {
  it('shows the "preview unavailable" fallback after the image fails to load', () => {
    render(<SceneProfileEditorCard {...baseProps()} />);

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument();
  });

  it('resets the failed-image state when a different profile (a different file_url) loads, so a prior failure does not stick to a new profile', () => {
    const { rerender } = render(<SceneProfileEditorCard {...baseProps()} />);

    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument();

    rerender(
      <SceneProfileEditorCard
        {...baseProps({
          profile: makeProfile({ file_url: 'https://cdn.example.com/scene_reference/x/new.png', version: 2 }),
        })}
      />,
    );

    // Without resetting on file_url change, this stayed "unavailable" forever
    // -- every subsequently loaded/replaced profile would show the fallback
    // even though its own image was never actually tried.
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.queryByText(/preview unavailable/i)).not.toBeInTheDocument();
  });

  it('keeps the failed-image state across an unrelated rerender with the same file_url', () => {
    const { rerender } = render(<SceneProfileEditorCard {...baseProps()} />);

    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument();

    // Same profile/file_url, only an unrelated prop changed.
    rerender(<SceneProfileEditorCard {...baseProps({ isSaving: true })} />);

    expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument();
  });
});
