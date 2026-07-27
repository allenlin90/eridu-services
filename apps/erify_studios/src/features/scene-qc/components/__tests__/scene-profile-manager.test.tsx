import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SceneProfileManager } from '../scene-profile-manager';

const mockClientOptions = vi.fn();
const mockEditor = vi.fn();

vi.mock('../../hooks/use-scene-profile-client-options', () => ({
  useSceneProfileClientOptions: () => mockClientOptions(),
}));
vi.mock('../../hooks/use-scene-profile-editor', () => ({
  useSceneProfileEditor: () => mockEditor(),
}));
vi.mock('../scene-profile-editor-card', () => ({
  SceneProfileEditorCard: () => <div data-testid="editor-card" />,
}));
vi.mock('../scene-profile-empty-state', () => ({
  SceneProfileEmptyState: () => <div data-testid="empty-state" />,
}));

function baseEditor(overrides: Record<string, unknown> = {}) {
  return {
    profile: null,
    hasNoProfile: false,
    isLoading: false,
    loadError: null,
    sceneType: 'GRAPHIC_BG',
    setSceneType: vi.fn(),
    selectedFile: null,
    selectFile: vi.fn(),
    clearFile: vi.fn(),
    save: vi.fn(),
    retire: vi.fn(),
    isUploading: false,
    isSaving: false,
    isRetiring: false,
    uploadError: null,
    conflictMessage: null,
    dismissConflict: vi.fn(),
    canSave: false,
    ...overrides,
  };
}

describe('sceneProfileManager', () => {
  beforeEach(() => {
    mockClientOptions.mockReturnValue({
      clientOptions: [],
      selectedClient: undefined,
      isLoading: false,
      setClientSearch: vi.fn(),
    });
  });

  it('requires a client to be selected before rendering any profile state', () => {
    mockEditor.mockReturnValue(baseEditor());
    render(<SceneProfileManager studioId="studio_abc" clientId={undefined} onClientChange={vi.fn()} />);

    expect(screen.queryByTestId('editor-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders the empty state when the client has no profile', () => {
    mockEditor.mockReturnValue(baseEditor({ hasNoProfile: true }));
    render(<SceneProfileManager studioId="studio_abc" clientId="client_xyz" onClientChange={vi.fn()} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('editor-card')).not.toBeInTheDocument();
  });

  it('renders the editor card when a profile exists', () => {
    mockEditor.mockReturnValue(baseEditor({ profile: { id: 'scprof_1', version: 1 } }));
    render(<SceneProfileManager studioId="studio_abc" clientId="client_xyz" onClientChange={vi.fn()} />);

    expect(screen.getByTestId('editor-card')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('shows a dismissible conflict banner with text (not color alone) when a 409 occurs', () => {
    const dismissConflict = vi.fn();
    mockEditor.mockReturnValue(baseEditor({
      profile: { id: 'scprof_1', version: 1 },
      conflictMessage: 'This Scene Profile changed since you loaded it.',
      dismissConflict,
    }));
    render(<SceneProfileManager studioId="studio_abc" clientId="client_xyz" onClientChange={vi.fn()} />);

    expect(screen.getByText('This Scene Profile changed since you loaded it.')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('does not render either profile state while loading', () => {
    mockEditor.mockReturnValue(baseEditor({ isLoading: true }));
    render(<SceneProfileManager studioId="studio_abc" clientId="client_xyz" onClientChange={vi.fn()} />);

    expect(screen.queryByTestId('editor-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});
