# erify_api

> **TLDR**: NestJS REST API for live-commerce operations — manages shows, schedules, tasks, users, clients, MCs, platforms, and studios. Uses Prisma/PostgreSQL, JWT auth via `@eridu/auth-sdk`, and Zod validation via `@eridu/api-types`. Three controller scopes: `/admin/*` (system admins), `/studios/:id/*` (studio members), `/me/*` (authenticated users).

The API uses JWT validation via `@eridu/auth-sdk` SDK for authentication and StudioMembership model for authorization. For detailed implementation status and roadmap, see [Phase 1 Roadmap](../../docs/roadmap/PHASE_1.md).

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm (recommended) or npm
- PostgreSQL database

### Installation

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database and configuration settings
   ```

   For cross-app JWT identity mapping after seed, set:

   ```bash
   ERIDU_AUTH_DATABASE_URL=postgresql://admin:secret@localhost:5432/eridu_auth
   ```

3. **Set up the database**

   ```bash
   # Generate Prisma client
   pnpm run db:generate

   # Run database migrations
   pnpm run db:migrate:deploy

   # Seed the database (optional)
   pnpm run db:seed
   ```

4. **Start the development server**
   ```bash
   pnpm run start:dev
   ```

The API will be available at `http://localhost:3000`

### API Documentation

- `GET /api-reference` - Interactive API documentation (Scalar UI)
- `GET /swagger-json` - OpenAPI specification in JSON format

### Health Check Endpoints

- `GET /health` - Liveness probe (returns 200 if application is running)
- `GET /health/ready` - Readiness probe (returns 200 if application is ready to accept traffic)

## 📋 Available Scripts

### Development

```bash
# Start development server with hot reload
pnpm run start:dev

# Start production server
pnpm run start:prod

# Build the application
pnpm run build
```

### Database Operations

```bash
# Create a new migration
pnpm run db:migrate:create

# Deploy migrations
pnpm run db:migrate:deploy

# Reset database (⚠️ destructive)
pnpm run db:migrate:reset

# Seed database with sample data
pnpm run db:seed

# Seed now includes baseline schedules + shows (+ MC/platform links) for local testing
# Manual schedule scripts are optional for high-volume workflow testing only

# Deterministic local cycle (reset -> migrate -> seed)
pnpm run db:local:refresh

# Optional post-seed ext_id sync from eridu_auth.user.id -> erify_api.users.ext_id
pnpm run db:extid:sync

# Open Prisma Studio (database GUI)
pnpm run db:studio

# Generate Prisma client
pnpm run db:generate
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run e2e tests
pnpm run test:e2e

# Generate test coverage report
pnpm run test:cov
```

### Code Quality

```bash
# Run ESLint
pnpm run lint

# Format code with Prettier
pnpm run format
```

## 🏗️ Architecture Overview

The API follows a modular architecture with clear separation of concerns:

```
📁 src/
├── 🏠 app.module.ts          # Root module
├── 👥 admin/                 # Administrative operations
│   ├── users/               # User management
│   ├── clients/             # Client management
│   └── mcs/                 # MC management
├── 🏢 [domain]/             # Business logic modules
│   ├── user/               # User entity
│   ├── client/             # Client entity
│   └── mc/                 # MC entity
├── 🔧 common/              # Shared utilities
│   ├── utils/              # Utility functions
│   ├── services/           # Common services
│   └── decorators/         # Custom decorators
├── 🗄️ prisma/              # Database layer
└── ⚙️ utility/             # Utility services
```

### Key Features

- **🔐 Type Safety**: Full TypeScript support with Zod validation
- **📊 Pagination**: Built-in pagination for all list endpoints
- **🔄 Soft Delete**: Data retention with soft delete pattern
- **🆔 UID System**: Branded unique identifiers for external references
- **📝 Case Conversion**: Automatic snake_case ↔ camelCase conversion
- **🏷️ Entity Resolution**: Automatic UID to ID resolution for relationships
- **📋 Comprehensive CRUD**: Complete Create, Read, Update, Delete operations
- **📦 Bulk Operations**: Bulk create and update schedules with partial success handling
- **📸 Snapshot Versioning**: Automatic version history with immutable snapshots for schedules
- **🔒 Optimistic Locking**: Version-based conflict prevention for concurrent updates
- **✅ Pre-Publish Validation**: Validation service for schedule conflicts and data integrity
- **📅 Monthly Overview**: Schedules grouped by client and status within date ranges
- **🏥 Health Checks**: Liveness and readiness probes for load balancers
- **🛡️ Graceful Shutdown**: Production-ready shutdown with request draining
- **📚 OpenAPI Documentation**: Interactive API documentation with Scalar UI

## 🌐 API Endpoints

### Base URL

```
http://localhost:3000
```

### Authentication

The API uses JWT validation via `@eridu/auth-sdk` SDK, validating tokens from the `eridu_auth` service using Better Auth's JWKS endpoint. The SDK provides:

- Automatic JWKS caching on startup
- Edge/worker runtime support with on-demand JWKS fetching
- Automatic key rotation handling
- `@CurrentUser()` decorator for accessing authenticated user information

**Authorization**:
- **System Admin**: Users with `is_system_admin=true` have full access to `/admin/*` endpoints.
- **Studio Admin**: Admin access within specific studios is determined via StudioMembership model (Phase 1).
See [Authentication Guide](docs/design/AUTHORIZATION_GUIDE.md) for details.

**Service-to-Service Authentication**:

- Backdoor endpoints (`/backdoor/*`) use API key authentication for privileged operations
- Schedule endpoints (`/admin/schedules/*`) use Google Sheets API key authentication
- See [Server-to-Server Authentication Guide](docs/design/AUTHORIZATION_GUIDE.md) for details

### Available Endpoints

#### 👤 User Profile (`/me`)

- `GET /me` - Get authenticated user profile (including `is_system_admin` status)

#### 🎬 User Shows (`/me/shows`)

- `GET /me/shows` - List shows assigned to the authenticated MC user (paginated, sorted by start time descending)
- `GET /me/shows/:show_id` - Get show details for a specific show assigned to the authenticated MC user

**Note**: These endpoints require JWT authentication. The user information is extracted from the JWT token payload using the `@CurrentUser()` decorator, and the `ext_id` field is used to query MC assignments.

For local dev, seeded users include deterministic `ext_id` values.
If you need to align with real ids from another local auth database:
- Default: `pnpm run db:extid:sync` (requires `ERIDU_AUTH_DATABASE_URL`)

Note: sync updates `erify_api.users.ext_id` only. It does not modify `eridu_auth.user.id`.

#### 👥 Users (`/admin/users`)

- `GET /admin/users` - List users with pagination
- `POST /admin/users` - Create a new user
- `GET /admin/users/:id` - Get user by ID
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Soft delete user

#### 🏢 Clients (`/admin/clients`)

- `GET /admin/clients` - List clients with pagination
- `POST /admin/clients` - Create a new client
- `GET /admin/clients/:id` - Get client by ID
- `PATCH /admin/clients/:id` - Update client
- `DELETE /admin/clients/:id` - Soft delete client

#### 🎤 Creators (`/admin/creators`)

- `GET /admin/creators` - List creators with pagination
- `POST /admin/creators` - Create a new creator
- `GET /admin/creators/:id` - Get creator by ID
- `PATCH /admin/creators/:id` - Update creator
- `DELETE /admin/creators/:id` - Soft delete creator
- Legacy alias: `/admin/mcs*`

#### 📺 Platforms (`/admin/platforms`)

- `GET /admin/platforms` - List platforms with pagination
- `POST /admin/platforms` - Create a new platform
- `GET /admin/platforms/:id` - Get platform by ID
- `PATCH /admin/platforms/:id` - Update platform
- `DELETE /admin/platforms/:id` - Soft delete platform

#### 🎭 Show Types (`/admin/show-types`)

- `GET /admin/show-types` - List show types with pagination
- `POST /admin/show-types` - Create a new show type
- `GET /admin/show-types/:id` - Get show type by ID
- `PATCH /admin/show-types/:id` - Update show type
- `DELETE /admin/show-types/:id` - Soft delete show type

#### 📊 Show Statuses (`/admin/show-statuses`)

- `GET /admin/show-statuses` - List show statuses with pagination
- `POST /admin/show-statuses` - Create a new show status
- `GET /admin/show-statuses/:id` - Get show status by ID
- `PATCH /admin/show-statuses/:id` - Update show status
- `DELETE /admin/show-statuses/:id` - Soft delete show status

#### ⭐ Show Standards (`/admin/show-standards`)

- `GET /admin/show-standards` - List show standards with pagination
- `POST /admin/show-standards` - Create a new show standard
- `GET /admin/show-standards/:id` - Get show standard by ID
- `PATCH /admin/show-standards/:id` - Update show standard
- `DELETE /admin/show-standards/:id` - Soft delete show standard

#### 🏢 Studios (`/admin/studios`)

- `GET /admin/studios` - List studios with pagination
- `POST /admin/studios` - Create a new studio
- `GET /admin/studios/:id` - Get studio by ID
- `PATCH /admin/studios/:id` - Update studio
- `DELETE /admin/studios/:id` - Soft delete studio

#### 🚪 Studio Rooms (`/admin/studio-rooms`)

- `GET /admin/studio-rooms` - List studio rooms with pagination
- `POST /admin/studio-rooms` - Create a new studio room
- `GET /admin/studio-rooms/:id` - Get studio room by ID
- `PATCH /admin/studio-rooms/:id` - Update studio room
- `DELETE /admin/studio-rooms/:id` - Soft delete studio room

#### 📺 Shows (`/admin/shows`)

- `GET /admin/shows` - List shows with pagination and relations
- `POST /admin/shows` - Create a new show
- `GET /admin/shows/:id` - Get show by ID
- `PATCH /admin/shows/:id` - Update show
- `DELETE /admin/shows/:id` - Soft delete show

#### 🎬 Show MCs (`/admin/show-mcs`)

- `GET /admin/show-mcs` - List show-MC relationships with pagination
- `POST /admin/show-mcs` - Create show-MC assignment
- `GET /admin/show-mcs/:id` - Get show-MC by ID
- `PATCH /admin/show-mcs/:id` - Update show-MC assignment
- `DELETE /admin/show-mcs/:id` - Soft delete show-MC assignment

#### 🌐 Show Platforms (`/admin/show-platforms`)

- `GET /admin/show-platforms` - List show-platform integrations with pagination
- `POST /admin/show-platforms` - Create show-platform integration
- `GET /admin/show-platforms/:id` - Get show-platform by ID
- `PATCH /admin/show-platforms/:id` - Update show-platform integration
- `DELETE /admin/show-platforms/:id` - Soft delete show-platform integration

#### 👥 Studio Memberships (`/admin/studio-memberships`)

- `GET /admin/studio-memberships` - List studio memberships with pagination
- `POST /admin/studio-memberships` - Create studio membership
- `GET /admin/studio-memberships/:id` - Get studio membership by ID
- `PATCH /admin/studio-memberships/:id` - Update studio membership
- `DELETE /admin/studio-memberships/:id` - Soft delete studio membership

#### 📅 Schedules (`/admin/schedules`)

- `GET /admin/schedules` - List schedules with pagination and filtering
- `POST /admin/schedules` - Create a new schedule
- `GET /admin/schedules/:id` - Get schedule by ID
- `PATCH /admin/schedules/:id` - Update schedule (auto-creates snapshot on plan document changes)
- `DELETE /admin/schedules/:id` - Soft delete schedule
- `POST /admin/schedules/:id/validate` - Validate schedule before publish
- `POST /admin/schedules/:id/publish` - Publish schedule to shows (individual publishing)
- `POST /admin/schedules/:id/duplicate` - Duplicate schedule
- `GET /admin/schedules/:id/snapshots` - List schedule snapshots
- `POST /admin/schedules/bulk` - Bulk create schedules with partial success handling ✅
- `PATCH /admin/schedules/bulk` - Bulk update schedules with partial success handling ✅
- `GET /admin/schedules/overview/monthly` - Get monthly overview with schedules grouped by client and status ✅

**Note**: Bulk publish operations (publish multiple schedules in single API call) are deferred to Phase 2. Current approach: publish schedules individually via `POST /admin/schedules/:id/publish`.

#### 📸 Schedule Snapshots (`/admin/snapshots`)

- `GET /admin/snapshots/:id` - Get schedule snapshot details
- `POST /admin/snapshots/:id/restore` - Restore schedule from snapshot

**Note**: Snapshots are automatically created when schedule plan documents are updated. They provide immutable version history for audit trails and rollback capabilities.

#### 🗓️ Studio Shifts (`/studios/:studioId/shifts`)

Studio-admin–only shift management (requires `ADMIN` or `MANAGER` role):

- `GET /studios/:studioId/shifts` - List shifts with pagination (filter by user/status/date)
- `POST /studios/:studioId/shifts` - Create a shift with time blocks
- `GET /studios/:studioId/shifts/:id` - Get shift by ID
- `PATCH /studios/:studioId/shifts/:id` - Update shift (blocks, duty-manager flag, status)
- `DELETE /studios/:studioId/shifts/:id` - Soft delete shift
- `GET /studios/:studioId/shifts/duty-manager` - Get current duty manager for a timestamp
- `GET /studios/:studioId/shifts/calendar` - Calendar events for a date range (view-aware limit)
- `GET /studios/:studioId/shifts/alignment` - Duty-manager coverage + task-readiness risk report

#### 🗓️ My Shifts (`/me/shifts`)

- `GET /me/shifts` - List the authenticated user's own shifts (paginated, filterable by date/studio)

#### 🔐 Backdoor Endpoints (`/backdoor/*`)

Service-to-service API key authenticated endpoints for privileged operations:

- `POST /backdoor/users` - Create user (API key required)
- `PATCH /backdoor/users/:id` - Update user (API key required)
- `POST /backdoor/studio-memberships` - Create studio membership (API key required)
- `POST /backdoor/auth/jwks/refresh` - Manually refresh JWKS cache (API key required)

**Note**: These endpoints are separate from admin endpoints and use API key authentication. See [Server-to-Server Authentication Guide](docs/design/AUTHORIZATION_GUIDE.md) for details.

## 📚 OpenAPI Documentation

The API includes comprehensive OpenAPI documentation powered by Scalar UI, providing an interactive interface for exploring and testing all endpoints.

### Accessing Documentation

- **Interactive Documentation**: Visit `http://localhost:3000/api-reference` for the full Scalar UI interface
- **OpenAPI JSON Spec**: Access the raw OpenAPI specification at `http://localhost:3000/swagger-json`

### Features

- **🔍 Interactive Testing**: Test API endpoints directly from the documentation interface
- **📋 Schema Validation**: View detailed request/response schemas with Zod integration
- **🏷️ Endpoint Grouping**: Organized by admin modules (users, clients, mcs, etc.)
- **🔐 Authentication Support**: Bearer token authentication configuration
- **📱 Responsive Design**: Mobile-friendly documentation interface

### Implementation Details

The OpenAPI implementation includes:

- **Zod Integration**: Automatic schema generation from Zod validation schemas
- **Custom Decorators**: `ApiZodResponse`, `ApiZodBody`, `ApiZodQuery`, `ApiZodParam` for type-safe documentation
- **Comprehensive Coverage**: All CRUD operations documented with proper request/response schemas
- **Modern UI**: Scalar UI provides a modern, intuitive interface for API exploration

### Request/Response Format

#### Input Format (snake_case)

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "ext_id": "external_123",
  "profile_url": "https://example.com/profile",
  "contact_person": "Jane Smith",
  "contact_email": "jane@example.com",
  "alias_name": "MC Alias",
  "user_id": "user_123",
  "metadata": {
    "custom_field": "value"
  }
}
```

#### Output Format (snake_case)

```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Pagination Response

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## 🗄️ Database Schema

### Currently Implemented Entities

#### User

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `ext_id` (External ID for SSO)
- `email` (Unique)
- `name`
- `is_banned` (Boolean)
- `profile_url`
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### Client

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name` (Unique)
- `contact_person`
- `contact_email`
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### Creator (MC-compatible)

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name`
- `alias_name`
- `is_banned`
- `user_id` (Foreign Key to User, nullable)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### Platform

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name`
- `api_config` (JSON)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### ShowType

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name` (Unique)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### ShowStatus

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name` (Unique)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### ShowStandard

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name` (Unique)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### Studio

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name`
- `address`
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### StudioRoom

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `studio_id` (Foreign Key to Studio)
- `name`
- `capacity`
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### StudioMembership (Phase 1)

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `user_id` (Foreign Key to User)
- `studio_id` (Foreign Key to Studio)
- `role` (admin, manager, member)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

**Note**: Phase 1 implements studio-specific memberships only. Client and Platform memberships will be added in Phase 3.

#### Schedule

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name`
- `start_date`, `end_date`
- `status` (draft, review, published)
- `published_at` (DateTime, nullable)
- `plan_document` (JSON) - Complete schedule data stored as JSON with metadata and show items
- `version` (Integer, for optimistic locking)
- `client_id` (Foreign Key to Client, nullable)
- `created_by` (Foreign Key to User, nullable)
- `published_by` (Foreign Key to User, nullable)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

**Note**: The Schedule Planning Management System uses JSON-based planning documents for flexible spreadsheet-like editing during draft phase. Only published schedules sync their JSON data to normalized Show tables. Automatic snapshots are created when plan documents are updated.

#### ScheduleSnapshot

- `id` (Primary Key)
- `uid` (Unique Identifier)
- `plan_document` (JSON) - Immutable snapshot of schedule plan document
- `version` (Integer) - Which version this snapshot represents
- `status` (String) - Status at time of snapshot
- `snapshot_reason` (String) - auto_save, before_publish, manual, before_restore
- `created_by` (Foreign Key to User, nullable)
- `schedule_id` (Foreign Key to Schedule)
- `metadata` (JSON)
- `created_at` (DateTime, immutable)

**Note**: Snapshots provide immutable version history for audit trails and rollback capabilities. They are automatically created when schedule plan documents are updated.

### Relationships

- **User** ↔ **MC**: One-to-One (User can optionally have one MC profile)
- **User** ↔ **StudioMembership**: One-to-Many (User can have multiple studio memberships)
- **Studio** ↔ **StudioRoom**: One-to-Many (Studio has multiple rooms)
- **Studio** ↔ **StudioMembership**: One-to-Many (Studio has multiple memberships)
- **Client** ↔ **Show**: One-to-Many
- **Client** ↔ **Schedule**: One-to-Many
- **StudioRoom** ↔ **Show**: One-to-Many
- **Client** ↔ **Material**: One-to-Many (Planned for Phase 4)
- **Platform** ↔ **Material**: One-to-Many (Planned for Phase 4)

### Future Entities (Planned)

The database schema includes comprehensive models for the full livestream production system:

- **Shows**: Core operational records for livestream productions ✅ (Implemented)
- **ShowMC & ShowPlatform**: Show relationship management ✅ (Implemented)
- **Schedules & ScheduleSnapshots**: Collaborative planning system ✅ (Implemented)
- **Tasks & TaskTemplates**: Workflow automation ✅ (Implemented — Phase 2)
- **Materials & MaterialTypes**: Content assets management (Phase 4)
- **Comments**: Collaboration system (Phase 4)
- **Tags & Taggables**: Flexible categorization (Phase 4)
- **Audits**: Complete audit trail (Phase 4)

See the root [Business Documentation](../../docs/product/BUSINESS.md) for cross-app domain context and [System Architecture Overview](../../docs/product/ARCHITECTURE_OVERVIEW.md) for monorepo architecture. Backend implementation history remains under `apps/erify_api/docs/`.

## 🛠️ Development

### Project Structure

```
apps/erify_api/
├── 📁 docs/                 # Comprehensive documentation
├── 📁 prisma/              # Database schema and migrations
├── 📁 src/                 # Source code
│   ├── 📁 admin/           # Admin modules
│   ├── 📁 common/          # Shared utilities
│   ├── 📁 [domain]/        # Domain modules
│   └── 📁 utility/         # Utility services
├── 📁 test/                # Test files
└── 📄 Configuration files
```

### Adding New Entities

1. **Create Domain Module**

   ```bash
   # Generate module structure
   nest g module [entity-name]
   nest g service [entity-name]
   nest g controller [entity-name]
   ```

2. **Create Admin Module**

   ```bash
   # Generate admin module
   nest g module admin/[entity-name]
   nest g service admin/[entity-name]
   nest g controller admin/[entity-name]
   ```

3. **Update Documentation**
   - Follow the documentation maintenance guide in `docs/`
   - Update architecture diagrams
   - Add API endpoint documentation

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with strict rules
- **Prettier**: Code formatting
- **Import Sorting**: Automatic import organization

### Testing

- **Unit Tests**: Jest with comprehensive coverage
- **E2E Tests**: End-to-end API testing
- **Mocking**: Repository and service mocking
- **Coverage**: Minimum 80% coverage requirement

### Manual Testing Workflows

Test complex E2E workflows to understand realistic usage patterns:

```bash
# Schedule Planning workflow (create, validate, publish)
pnpm -F erify_api manual:schedule:all

# User & Membership setup workflow (backdoor operations)
pnpm -F erify_api manual:backdoor:all

# Authentication workflow (login, token validation)
pnpm -F erify_api manual:auth:all
```

**Note**: Manual tests use generated data and are resilient to feature updates. They provide comprehensive validation of multi-step workflows across the API.

See [Manual Testing Guide](manual-test/README.md) for detailed workflow documentation and individual script usage.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory. Refer to specific documents based on your task:

### Design

| Document                                                                                               | Status | Description                                                                    |
| ------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| [Authorization Guide](docs/design/AUTHORIZATION_GUIDE.md)                                              | 📐      | Proposed JSONB-based RBAC (current auth: `isSystemAdmin` + `StudioMembership`) |
| [Pending-Resolution MVP](docs/design/IMPLEMENTATION_CANCELLED_PENDING_RESOLUTION_GAP_MVP.md)           | ⏳      | Studio-scoped resolution for cancelled shows                                   |
| [Ad-hoc Task Ticketing](docs/design/AD_HOC_TASK_TICKETING.md)                                         | 📐      | Planned template-less task creation using the existing `Task` model            |
| [Material Management](docs/design/MATERIAL_MANAGEMENT_DESIGN.md)                                      | 🗓️      | Planned for Phase 4; not implemented in the current schema                     |
| [Data Warehouse Design](docs/design/DATA_WAREHOUSE_DESIGN.md)                                         | 🗓️      | Planned Datastream + BigQuery architecture for Phase 4 analytics               |

### Roadmap

| Document                                               | Use When                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| [Documentation Index](docs/README.md)                  | Need a quick overview of all documentation                     |
| [System Architecture Overview](../../docs/product/ARCHITECTURE_OVERVIEW.md)  | Understanding cross-app architecture and boundaries            |
| [Business Domain](../../docs/product/BUSINESS.md)                    | Understanding product/domain concepts and business rules          |
| [Authentication Guide](docs/design/AUTHORIZATION_GUIDE.md)    | Implementing auth patterns and guard usage                     |
| [Server-to-Server Auth](docs/design/AUTHORIZATION_GUIDE.md) | Adding service-to-service endpoints                            |
| [Schedule Planning](docs/SCHEDULE_PLANNING.md)         | Working on schedule planning features                          |
| [Phase 1 Roadmap](../../docs/roadmap/PHASE_1.md)       | Core foundation that is fully implemented                      |
| [Phase 2 Roadmap](../../docs/roadmap/PHASE_2.md)       | Task-management foundation and remaining follow-up context     |
| [Phase 3 Roadmap](../../docs/roadmap/PHASE_3.md)             | Current cross-app closure summary for Phase 3                  |
| [Phase 4 Roadmap](../../docs/roadmap/PHASE_4.md)             | Planned review-quality, ticketing, materials, and analytics work |
| [Manual Testing Guide](manual-test/README.md)          | Running E2E workflows: `pnpm -F erify_api manual:schedule:all` |

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/eridu_db"

# Application
NODE_ENV="development"
PORT=3000

# Authentication & Authorization
ERIDU_AUTH_URL="http://localhost:3000"  # Base URL of eridu_auth service

# Service-to-Service Authentication (Required for schedule operations)
BACKDOOR_API_KEY="your-api-key-here"     # API key for backdoor endpoints (/backdoor/*)
GOOGLE_SHEETS_API_KEY="your-api-key"     # API key for Google Sheets integration (required for /admin/schedules/* endpoints)

# Graceful Shutdown
SHUTDOWN_TIMEOUT=30000  # milliseconds (default: 30 seconds)

# Logging
LOG_LEVEL="info"
```

### Prisma Configuration

The project uses Prisma as the ORM with PostgreSQL. Configuration is in `prisma/schema.prisma`.

### OpenAPI Configuration

The API documentation is powered by:

- **@nestjs/swagger**: NestJS Swagger integration
- **@scalar/nestjs-api-reference**: Scalar UI for modern API documentation
- **zod-openapi**: Zod to OpenAPI schema conversion
- **swagger-ui-express**: Swagger UI Express integration

The OpenAPI setup is configured in `src/common/openapi/openapi.config.ts` and provides:

- Interactive documentation at `/api-reference`
- OpenAPI JSON specification at `/swagger-json`
- Custom Zod decorators for type-safe documentation

## 🚀 Deployment

### Production Build

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start:prod
```

### Graceful Shutdown

The application supports production-ready graceful shutdown for zero-downtime deployments:

- **Signal Handling**: Responds to SIGTERM and SIGINT signals
- **Request Draining**: Stops accepting new connections during shutdown
- **Database Cleanup**: Automatically disconnects from Prisma database
- **Health Checks**: `/health` and `/health/ready` endpoints for load balancers
- **Configurable Timeout**: `SHUTDOWN_TIMEOUT` environment variable (default: 30s)

### Docker (Optional)

```bash
# Build Docker image
docker build -t eridu-api .

# Run container
docker run -p 3000:3000 eridu-api
```

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Write tests for new functionality
   - Update documentation

3. **Test Changes**

   ```bash
   pnpm run test
   pnpm run lint
   ```

4. **Update Documentation**
   - Follow the documentation maintenance guide
   - Update relevant documentation files
   - Verify all examples work

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Tests are comprehensive and passing
- [ ] Documentation is updated
- [ ] API endpoints are documented
- [ ] Database migrations are included (if needed)
- [ ] Linting passes without errors

## 🐛 Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check database connection
pnpm run db:studio

# Reset database if needed
pnpm run db:migrate:reset
```

#### TypeScript Errors

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Regenerate Prisma client
pnpm run db:generate
```

#### Test Failures

```bash
# Run tests with verbose output
pnpm run test -- --verbose

# Check test coverage
pnpm run test:cov
```

### Getting Help

- **Documentation**: Check the `docs/` directory
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

## 📄 License

This project is intended to use the MIT license; no local `LICENSE` file is currently present in this workspace.

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **Prisma** - Next-generation ORM
- **TypeScript** - Typed JavaScript
- **Zod** - TypeScript-first schema validation

---

**Happy Coding! 🚀**

For more detailed information, please refer to the comprehensive documentation in the `docs/` directory.
