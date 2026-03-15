# erify_studios

> **TLDR**: Studio admin React app for managing shows, tasks, templates, and schedules. Features: admin CRUD tables (sorting/filtering/URL state), task template builder, bulk task generation, operator task execution (JsonForm), review queue, and studio context switching. Built with TanStack Router + React Query + Vite.

**Current Status**: Phase 2 ✅ - Studio admin UI + studio-scoped task management (task templates, task execution, shifts, shows per studio)

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- pnpm (recommended) or npm/yarn
- `erify_api` service running (for API endpoints)
- `eridu_auth` service running (for authentication)
- Admin permissions required (verified via `StudioMembership` in backend)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server (with API/Auth services running)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint

# Format code
pnpm format
```

### Environment Setup

Create a `.env` file (copy from `.env.example`):

```env
# Auth service URL (used for login/session validation)
VITE_AUTH_URL=http://localhost:5173

# API service URL (for backend API calls)
VITE_API_URL=http://localhost:3000
```

**Note**: In development, Vite dev server handles proxying to backend services.

## 📖 Documentation for AI Agents

When working on erify_studios, refer to these guides:

| Document                                                      | Use When                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| This README                                                   | Understanding project structure, architecture, testing, and setup         |
| [Agent Instructions](../../AGENTS.md)                         | Understanding monorepo patterns, conventions, and cross-app communication |
| [erify_api Docs](../erify_api/docs/)                          | Working on API integration, understanding backend features                |
| [Auth SDK Docs](../../packages/auth-sdk/README.md)            | Implementing authentication flows, session management                     |
| [API Types Docs](../../packages/api-types/README.md)          | Understanding shared schemas and types                                    |
| [UI Library](../../packages/ui/)                              | Building UI components with shadcn/ui                                     |
| [i18n Package](../../packages/i18n/README.md)                 | Adding new translations or language support                               |
| [PWA Shell Runbook](./docs/PWA_SHELL_RUNBOOK.md)              | App shell update behavior, recovery flow, and service worker maintenance  |

**Key Reference**: The [Architecture Principles](#architecture-principles) section below explains the three-layer pattern used throughout this app.

## ✨ Current Features

### Implemented (Phase 1) ✅

- ✅ **Task Template Builder**: Create and manage task templates with drag-and-drop sections and JSON Form specifications
- ✅ **Task Management**: Bulk task generation, operator task execution (JsonForm), and moderation review queue
- ✅ **Studio Shifts**: Studio-scoped shift schedule view
- ✅ **Studio Shows**: Studio-scoped show list
- ✅ **My Tasks**: Personal task queue for studio operators
- ✅ **Admin Dashboard**: Overview of system resources with access control
- ✅ **Studios Management**: Create and manage broadcast studios
- ✅ **Users Management**: Create, edit, and manage system users
- ✅ **Clients Management**: Manage clients and their associations
- ✅ **Creators Management**: Manage creator entities and profiles
- ✅ **Platforms Management**: Configure broadcast platforms
- ✅ **Show Types, Standards & Statuses**: Manage show classification and technical standards
- ✅ **Studio Memberships**: Assign users to studios with role-based access
- ✅ **Show Management**: View and manage shows created in the system
- ✅ **Schedule Management**: View and manage broadcast schedules with snapshot restore
- ✅ **Advanced Table**: Pagination, sorting, filtering with URL state persistence
- ✅ **Authentication**: JWT-based session management with admin authorization via `@eridu/auth-sdk`
- ✅ **Internationalization**: Multi-language support (English, Traditional Chinese, Thai)
- ✅ **Offline Support**: IndexedDB persistence for offline capability
- ✅ **PWA Shell**: Web manifest + auto-updating service worker with recovery tools in Settings (`/settings`)
- ✅ **Error Handling**: Global error boundary with recovery options
- ✅ **Responsive Design**: Mobile-friendly UI with sidebar collapse
- ✅ **Comprehensive Testing**: Unit and component tests with good coverage
- ✅ **Admin Authorization**: System admin verification and role-based access control

### Planned Features (Phase 2+)

- ⏳ **Bulk Operations**: Bulk update/create users, studios, and platform associations
- ⏳ **Advanced Filtering**: More sophisticated filtering options for admin queries
- ⏳ **Activity Audit Logs**: Track who modified what and when
- ⏳ **User Invitations**: Invite users to studios via email
- ⏳ **Role Management**: Fine-grained permission system
- ⏳ **Resource Quotas**: Set limits on studio resources and user accounts
- ⏳ **Analytics Dashboard**: Statistics and insights on broadcast activity

## 📁 Project Structure

This project follows the **Bulletproof React** architecture pattern with feature-based organization and includes comprehensive testing, API integration, and offline support:

```
src/
├── app.tsx                    # Main app component with providers
├── components/                # Shared UI components
│   ├── __tests__/            # Component tests
│   ├── route-error.tsx       # Global error handling component
│   └── route-pending.tsx     # Route loading component
├── config/                   # Application configuration
│   └── sidebar-config.tsx    # Sidebar navigation configuration
├── features/                 # Feature modules (business logic)
│   ├── admin/               # Generic admin table scaffolding
│   │   ├── components/      # AdminTable, AdminFormDialog, DeleteConfirmDialog, etc.
│   │   └── hooks/
│   ├── clients/             # Client management feature
│   ├── creators/            # Creator management feature
│   ├── memberships/         # Studio membership feature
│   ├── platforms/           # Platform management feature
│   ├── schedules/           # Schedule management + snapshot restore
│   ├── show-standards/      # Show standards feature
│   ├── show-statuses/       # Show statuses feature
│   ├── show-types/          # Show types feature
│   ├── shows/               # Show management feature
│   ├── studio-shifts/       # Studio-scoped shift schedule feature
│   ├── studio-shows/        # Studio-scoped show list feature
│   ├── studios/             # Studio management and studio context
│   ├── task-templates/      # Task template builder (drag-and-drop + JsonForm spec)
│   ├── tasks/               # Task management (bulk generation, execution, moderation)
│   └── users/               # User management feature
├── i18n/                    # Internationalization
│   ├── messages/            # Translation files (en.json, zh-TW.json, th.json)
│   └── index.ts             # i18n exports
├── layouts/                 # Layout components
│   ├── __tests__/
│   ├── sidebar-layout.tsx
│   └── sidebar-layout-header.tsx
├── lib/                     # Shared utilities and helpers
│   ├── api/                 # API client and utilities
│   │   ├── admin-resources.ts  # Admin CRUD operations
│   │   ├── admin.ts         # Admin API client
│   │   ├── client.ts        # Axios client with auth interceptors
│   │   ├── persister.ts     # IndexedDB persister for offline support
│   │   ├── query-client.ts  # React Query client configuration
│   │   ├── query-keys.ts    # Query key factory functions
│   │   ├── token-store.ts   # JWT token caching
│   │   └── user.ts          # User API operations
│   ├── auth.ts              # Authentication client
│   ├── hooks/               # Shared React hooks
│   │   ├── use-admin-crud.ts # Reusable CRUD operations hook
│   │   ├── use-is-system-admin.ts
│   │   ├── use-table-url-state.ts
│   │   └── use-user.ts
│   └── session-provider.tsx # Authentication session provider
├── pages/                   # Page-level components (orchestration)
│   └── not-found-page.tsx
├── paraglide/               # Generated i18n files (auto-generated)
├── router.tsx               # TanStack Router configuration
├── routes/                  # TanStack Router routes (thin routing layer)
│   ├── __root.tsx
│   ├── dashboard.tsx
│   ├── index.tsx
│   ├── studios/             # Studio-scoped section
│   │   ├── route.tsx        # Studio layout (validates studio membership)
│   │   └── $studioId/
│   │       ├── dashboard.tsx    # Studio dashboard (coverage cards, task-readiness)
│   │       ├── my-shifts.tsx    # Member's own shift schedule (table + calendar toggle)
│   │       ├── my-tasks.tsx     # Personal task queue
│   │       ├── shifts.tsx       # Studio shift schedule (admin: table + calendar)
│   │       ├── shows.tsx        # Studio show list
│   │       ├── task-templates.tsx
│   │       └── tasks.tsx        # Studio tasks (bulk gen, exec, review)
│   └── system/              # System admin section
│       ├── route.tsx
│       ├── clients/
│       ├── creators/
│       ├── memberships/
│       ├── platforms/
│       ├── schedules/
│       │   └── $scheduleId/
│       │       └── snapshots/   # Schedule snapshot restore
│       ├── show-standards/
│       ├── show-statuses/
│       ├── show-types/
│       ├── shows/
│       │   └── $showId/
│       ├── studios/
│       │   └── $studioId/
│       │       └── studio-rooms/
│       ├── task-templates/  # System-level task template management
│       ├── tasks/           # System-level task management
│       └── users/
├── routeTree.gen.ts         # Auto-generated route tree
├── test/
│   ├── setup.ts
│   └── test-utils.tsx
├── index.css
└── main.tsx
```

### Architecture Principles

1. **Feature-Based Organization**: Business logic is organized by features in the `features/` directory
2. **Three-Layer Architecture**: Routes → Pages → Feature Components
   - **Routes** (`routes/`): Thin routing configuration, delegates to pages
   - **Pages** (`pages/`): Page-level orchestration (data fetching, error handling, page structure)
   - **Feature Components** (`features/*/components/`): Reusable presentation components
3. **Separation of Concerns**:
   - Routes handle routing configuration only
   - Pages handle page-level concerns (data fetching, error handling, page structure)
   - Features contain reusable business logic and presentation components
   - Components contain shared UI components (error boundaries, loading states, etc.)
   - Layouts provide shared UI structure
   - Lib contains reusable utilities and helpers (pure functions, hooks, etc.)

> 📖 The three-layer architecture pattern separates routing concerns (routes), page orchestration (pages), and reusable business logic (features) for better maintainability and testability.

## 🛣️ Routing

The application uses [TanStack Router](https://tanstack.com/router) for type-safe routing with a **thin routing layer** pattern.

### Route Architecture Pattern

Following the three-layer architecture:

```
Routes (Thin) → Pages (Orchestration) → Features (UI Logic)
```

- **Routes** (`routes/`): Only handle routing configuration, delegate to pages
- **Pages** (`pages/`): Orchestrate features, manage data fetching, handle page-level state
- **Features** (`features/`): Encapsulate UI components, business logic, API calls

### Route Structure

The application has two main sections:

#### Studio Routes (`/studios/:studioId`)

Studio-scoped views accessible to studio members:
- `/studios/:studioId` - Studio dashboard and context
- `/studios/:studioId/dashboard` - Studio overview
- `/studios/:studioId/my-tasks` - Personal task queue for the current user
- `/studios/:studioId/shifts` - Studio shift schedule
- `/studios/:studioId/shows` - Shows assigned to this studio
- `/studios/:studioId/task-templates` - Task template list (infinite scroll)
- `/studios/:studioId/tasks` - Task management (bulk generate, execute, moderate)

#### System Routes (`/system`)

System-level administration (requires system admin):
- `/system` - System administration hub
- `/system/studios` - Studio management
- `/system/studios/:studioId/studio-rooms` - Studio room management
- `/system/users` - User management
- `/system/clients` - Client management
- `/system/creators` - Creator management
- `/system/platforms` - Platform management
- `/system/show-types` - Show type configuration
- `/system/show-standards` - Show standard configuration
- `/system/show-statuses` - Show status configuration
- `/system/memberships` - Studio membership management
- `/system/shows` - System-wide show management
- `/system/schedules` - System-wide schedule management
- `/system/schedules/:scheduleId/snapshots` - Snapshot restore
- `/system/task-templates` - System-level task template management
- `/system/tasks` - System-level task management

#### Other Routes
- `/dashboard` - User dashboard
- `/` - Redirects to `/dashboard`
- `/*` (catch-all) - 404 Not Found page

### Route Generation

Routes are automatically generated using TanStack Router's file-based routing:

- **Route Tree**: Auto-generated in `src/routeTree.gen.ts`
- **Type Safety**: Full TypeScript support for route parameters and search params
- **File-based**: Routes are defined as files in `src/routes/` directory
- **Catch-all Route**: `src/routes/$.tsx` handles unmatched routes (404s)
- **Admin Guard**: System admin routes require admin verification before access

### Adding New Routes

1. Create a new route file in `src/routes/` following TanStack Router conventions
2. Create a corresponding page component in `src/pages/` if needed
3. The route tree is automatically generated by the TanStack Router plugin
4. For admin routes, use `useIsSystemAdmin()` hook to verify access

Example:

```tsx
// src/routes/system/studios/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { StudiosPage } from '@/pages/system/studios-page';
import { useIsSystemAdmin } from '@/lib/hooks/use-is-system-admin';

export const Route = createFileRoute('/system/studios')({
  component: StudiosPageRoute,
});

function StudiosPageRoute() {
  const isAdmin = useIsSystemAdmin();
  
  if (!isAdmin) return <AdminAccessDenied />;
  
  return <StudiosPage />;
}
```

## 🧭 Navigation & Layout

The application uses a sidebar-based navigation system with configurable menu items and admin access controls:

### Sidebar Configuration (`src/config/sidebar-config.tsx`)

The sidebar is configured through a structured configuration object with role-based navigation:

```typescript
const sidebarConfig: AppSidebarProps = {
  header: {
    icon: Command,
    title: 'Erify',
    subtitle: 'Studios',
    url: '/',
  },
  navMain: [
    {
      title: m['sidebar.dashboard'](),
      url: '/dashboard',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: m['sidebar.admin'](),
      url: '/admin',
      icon: Tv,
      items: [
        {
          title: m['sidebar.shows'](),
          url: '/admin/shows',
        },
        {
          title: m['sidebar.schedules'](),
          url: '/admin/schedules',
        },
      ],
    },
    // System routes only visible to admins
    ...(isSystemAdmin ? [{ /* system routes */ }] : []),
  ],
};
```

### Admin Access Control

- **System Admin Verification**: `useIsSystemAdmin()` hook checks admin status
- **Conditional Navigation**: System routes only appear in sidebar for admins
- **Route Guards**: Admin routes verify permissions before rendering
- **Error Boundaries**: Access denied states handled gracefully

### Layout Components

- **SidebarLayout** (`src/layouts/sidebar-layout.tsx`): Main layout with collapsible sidebar
- **SidebarLayoutHeader** (`src/layouts/sidebar-layout-header.tsx`): Header with navigation controls
- **AppSidebar**: Reusable sidebar component from `@eridu/ui`

### Navigation Features

- **Responsive Design**: Sidebar collapses on mobile devices
- **Internationalization**: All navigation labels use i18n translations
- **User Context**: Displays current user information
- **Role-Based Navigation**: Admin routes conditionally shown based on permissions
- **Dynamic Items**: Support for dynamically populated navigation items

## 🧪 Testing

The application includes comprehensive testing coverage with multiple testing frameworks:

### Test Setup

- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **Jest DOM** - Additional DOM matchers
- **jsdom** - Browser environment simulation
- **Test utilities** - Custom testing helpers and setup

### Test Structure

```
src/
├── components/__tests__/    # Component tests
├── layouts/__tests__/       # Layout component tests
├── pages/__tests__/         # Page component tests
├── features/**/__tests__/   # Feature-specific tests
└── test/
    ├── setup.ts             # Global test setup
    └── test-utils.tsx       # Testing utilities
```

### Test Categories

- **Unit Tests**: Individual function and hook testing
- **Component Tests**: React component testing with RTL
- **Integration Tests**: Component interaction testing with admin features
- **Authorization Tests**: Verify admin access control works correctly

### Testing Commands

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test --watch
```

### Test Configuration

- **Parallel execution** for faster test runs
- **Coverage reporting** with detailed metrics
- **Visual testing UI** via Vitest UI
- **Watch mode** for development workflow

### Testing Admin Features

When testing admin routes and features:
- Use mock `useIsSystemAdmin()` hook to simulate admin status
- Test access denied states for non-admin users
- Verify role-based navigation changes
- Test form dialogs and CRUD operations

## 📊 Advanced Table Features

The application includes sophisticated table functionality with URL state synchronization and admin CRUD operations:

### URL State Management (`src/lib/hooks/use-table-url-state.ts`)

- **URL-driven table state** - All table state (pagination, sorting, filters) is synchronized with URL parameters
- **Browser navigation support** - Back/forward buttons work correctly with table state
- **Shareable URLs** - Table state can be shared via URL
- **Deep linking** - Direct links to specific table views

### Admin CRUD Hook (`src/lib/hooks/use-admin-crud.ts`)

- **Generic CRUD operations** - Reusable hook for create, read, update, delete operations
- **React Query integration** - Automatic caching and invalidation
- **Error handling** - Consistent error handling across admin features
- **Loading states** - Track operation status (loading, success, error)

### Table Components

- **AdminTable** (`src/features/admin/components/admin-table.tsx`): Main table component with CRUD actions
- **AdminFormDialog** (`src/features/admin/components/admin-form-dialog.tsx`): Form for create/edit operations
- **DeleteConfirmDialog** (`src/features/admin/components/delete-confirm-dialog.tsx`): Confirmation dialog for deletions
- **Columns**: Dynamically generated based on resource type

### Table Features

- **Pagination**: Server-side pagination with URL state
- **Sorting**: Multi-column sorting with URL persistence
- **Filtering**: Text search and date range filtering
- **Column visibility**: Show/hide columns dynamically
- **Row Actions**: Edit, delete buttons for each row
- **Responsive design**: Mobile-friendly table layout
- **Inline Forms**: Edit dialogs for quick updates

### Data Flow

```
URL Parameters → useTableUrlState → TanStack Table State → API Request → Table Display
     ↓
 useAdminCrud → React Query Mutations → Backend API → Table Invalidation
```

## 🌐 Internationalization (i18n)

This app uses [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for type-safe internationalization with:
- **Shared translations**: Common translations from `@eridu/i18n` package
- **App-specific translations**: Translations specific to this app

### Supported Languages

- `en` - English (default)
- `zh-TW` - Traditional Chinese
- `th` - Thai

### Usage

#### Basic Usage

```tsx
import * as m from '@/i18n';
import * as shared from '@eridu/i18n';

// Use app-specific translations
const adminTitle = m.admin_title(); // "Administration"

// Use shared translations
const welcome = shared.common_welcome(); // "Welcome", "歡迎", or "ยินดีต้อนรับ"
```

#### Using the React Hook (Recommended)

```tsx
import { useLanguage } from '@/i18n';

function MyComponent() {
  const { locale, setLocale, availableLocales } = useLanguage();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      {availableLocales.map(loc => (
        <option key={loc} value={loc}>{loc}</option>
      ))}
    </select>
  );
}
```

### Language Detection & Storage

The app automatically detects the user's language preference from:
1. `localStorage.getItem('language')` (if previously set)
2. Browser language settings
3. Falls back to English (`en`)

Language preferences are stored in **localStorage** (not cookies or route-based) for persistence across page reloads. The preference is automatically synced across browser tabs using the `storage` event.

### Adding New Translations

1. Edit `src/i18n/messages/en.json` for English translations
2. Edit corresponding language files (e.g., `zh-TW.json`, `th.json`)
3. Translations are automatically compiled during build/dev

### Build Process Integration

Paraglide JS integrates with the build process:

- **Development**: Translations are compiled on-the-fly with file watching
- **Production**: Translations are compiled during the build process
- **Generated Files**: Compiled translations are placed in `src/paraglide/`
- **Type Safety**: Full TypeScript support for all translation keys

## 🔐 Authentication & Authorization

### Authentication Flow

1. User logs in via `eridu_auth` service
2. JWT token received and stored in `token-store.ts` (IndexedDB + memory)
3. Axios interceptors automatically attach JWT to all API requests
4. Token expiration triggers automatic logout

### Authorization

**System Admin Routes**:
- Protected by `useIsSystemAdmin()` hook
- Verifies user's system admin status from JWT claims
- Routes return access denied component if not admin
- Admin status determined by `StudioMembership` model

**Session Provider**:
- Wrapped at app root (`src/app.tsx`)
- Provides `AuthContext` to entire app
- Manages user session and token lifecycle

## 📚 Resources

### API Documentation

- **Local API Reference**: When API running, visit `http://localhost:3000/api-reference` (Scalar UI)
- **API Types**: [`@eridu/api-types`](../../packages/api-types/README.md)
- **Admin Endpoints**: Documented in [erify_api Admin Guide](../erify_api/docs/design/AUTHORIZATION_GUIDE.md)

### Architecture & Design

- **[Agent Instructions](../../AGENTS.md)**: Monorepo conventions and patterns
- **[Product Architecture Overview](../../docs/engineering/ARCHITECTURE_OVERVIEW.md)**: Cross-app architecture and boundaries
- **[Product Business Context](../../docs/domain/BUSINESS.md)**: Domain entities and business rules

### Development Workflow

When implementing admin features:

1. **Check API Endpoints**: Review [erify_api docs](../erify_api/docs/) for available admin endpoints
2. **Understand Data Models**: See [Business Context](../../docs/domain/BUSINESS.md) for entity relationships
3. **Use Admin CRUD Hook**: Leverage `useAdminCrud()` for generic operations
4. **Add Table Columns**: Define columns and actions in features
5. **Test Admin Access**: Verify authorization and access control
6. **Add Translations**: Update i18n files for new UI text

### Known Issues & Future Work

See [Phase 5 backlog](../../docs/roadmap/PHASE_5.md) for tracked enhancements:
- Creator user association UI improvements (search/autocomplete)
- Pagination and filtering enhancements
- Duplicate user prevention

### Package Versions

See `package.json` for exact versions of:
- React 19
- TanStack Router v1
- TanStack React Query v5
- TanStack React Table v8
- Vite 7
- TypeScript 5

---

**Last Updated**: March 2026  
**Maintainers**: Eridu Services Team
