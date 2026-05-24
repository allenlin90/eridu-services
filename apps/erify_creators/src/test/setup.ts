import '@testing-library/jest-dom';

import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB for idb-keyval
const indexedDBMock = {
  open: vi.fn(() => Promise.resolve({
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        get: vi.fn(() => ({ onsuccess: null, onerror: null })),
        put: vi.fn(() => ({ onsuccess: null, onerror: null })),
        delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
      })),
    })),
  })),
};

Object.defineProperty(globalThis, 'indexedDB', {
  writable: true,
  value: indexedDBMock,
});

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useSearch: vi.fn(() => ({})),
    useRouterState: vi.fn(() => ({})),
    useMatch: vi.fn(() => ({})),
  };
});

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
    })),
    useQueryClient: vi.fn(() => ({})),
  };
});

// Mock hooks globally to prevent SessionProvider dependency regressions in tests
vi.mock('@/lib/hooks', () => ({
  useUserProfile: vi.fn(() => ({
    data: {
      id: 'usr_1',
      name: 'John Creator',
      email: 'john@example.com',
      creator: {
        uid: 'crt_1',
        name: 'John Creator',
        alias_name: 'JC',
        studio_creators: [
          {
            studio: { uid: 'std_1', name: 'Studio One' },
            is_active: true,
          },
        ],
      },
    },
    isLoading: false,
  })),
  useActiveStudio: vi.fn(() => ({
    activeStudioId: 'std_1',
    activeStudio: { studio: { uid: 'std_1', name: 'Studio One' } },
    studios: [{ studio: { uid: 'std_1', name: 'Studio One' }, is_active: true }],
    switchStudio: vi.fn(),
  })),
  useCreatorStudios: vi.fn(() => ({
    activeStudioId: 'std_1',
    activeStudio: { studio: { uid: 'std_1', name: 'Studio One' } },
    teams: [{ name: 'Studio One', plan: 'Active Roster' }],
    activeTeam: { name: 'Studio One', plan: 'Active Roster' },
    handleTeamChange: vi.fn(),
  })),
}));
