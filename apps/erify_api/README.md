# Eridu Services API

A modern, scalable REST API built with NestJS, providing administrative operations for managing users, clients, MCs (Master of Ceremonies), platforms, shows, schedules, and related entities with comprehensive CRUD functionality.

The API uses JWT validation via `@eridu/auth-sdk` SDK for authentication and StudioMembership model for authorization. For detailed implementation status and roadmap, see [Phase 1 Roadmap](docs/roadmap/PHASE_1.md).

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
See [Authentication Guide](docs/AUTHENTICATION_GUIDE.md) for details.

**Service-to-Service Authentication**:

- Backdoor endpoints (`/backdoor/*`) use API key authentication for privileged operations
- Schedule endpoints (`/admin/schedules/*`) use Google Sheets API key authentication
- See [Server-to-Server Authentication Guide](docs/SERVER_TO_SERVER_AUTH.md) for details

### Available Endpoints

#### 👤 User Profile (`/me`)

- `GET /me` - Get authenticated user profile (including `is_system_admin` status)

#### 🎬 User Shows (`/me/shows`)

- `GET /me/shows` - List shows assigned to the authenticated MC user (paginated, sorted by start time descending)
- `GET /me/shows/:show_id` - Get show details for a specific show assigned to the authenticated MC user

**Note**: These endpoints require JWT authentication. The user information is extracted from the JWT token payload using the `@CurrentUser()` decorator, and the `ext_id` field is used to query MC assignments.

#### 👥 Users (`/admin/users`)

- `GET /admin/users` - List users with pagination
- `POST /admin/users` - Create a new user
- `GET /admin/users/:uid` - Get user by UID
- `PATCH /admin/users/:uid` - Update user
- `DELETE /admin/users/:uid` - Soft delete user

#### 🏢 Clients (`/admin/clients`)

- `GET /admin/clients` - List clients with pagination
- `POST /admin/clients` - Create a new client
- `GET /admin/clients/:uid` - Get client by UID
- `PATCH /admin/clients/:uid` - Update client
- `DELETE /admin/clients/:uid` - Soft delete client

#### 🎤 MCs (`/admin/mcs`)

- `GET /admin/mcs` - List MCs with pagination
- `POST /admin/mcs` - Create a new MC
- `GET /admin/mcs/:uid` - Get MC by UID
- `PATCH /admin/mcs/:uid` - Update MC
- `DELETE /admin/mcs/:uid` - Soft delete MC

#### 📺 Platforms (`/admin/platforms`)

- `GET /admin/platforms` - List platforms with pagination
- `POST /admin/platforms` - Create a new platform
- `GET /admin/platforms/:uid` - Get platform by UID
- `PATCH /admin/platforms/:uid` - Update platform
- `DELETE /admin/platforms/:uid` - Soft delete platform

#### 🎭 Show Types (`/admin/show-types`)

- `GET /admin/show-types` - List show types with pagination
- `POST /admin/show-types` - Create a new show type
- `GET /admin/show-types/:uid` - Get show type by UID
- `PATCH /admin/show-types/:uid` - Update show type
- `DELETE /admin/show-types/:uid` - Soft delete show type

#### 📊 Show Statuses (`/admin/show-statuses`)

- `GET /admin/show-statuses` - List show statuses with pagination
- `POST /admin/show-statuses` - Create a new show status
- `GET /admin/show-statuses/:uid` - Get show status by UID
- `PATCH /admin/show-statuses/:uid` - Update show status
- `DELETE /admin/show-statuses/:uid` - Soft delete show status

#### ⭐ Show Standards (`/admin/show-standards`)

- `GET /admin/show-standards` - List show standards with pagination
- `POST /admin/show-standards` - Create a new show standard
- `GET /admin/show-standards/:uid` - Get show standard by UID
- `PATCH /admin/show-standards/:uid` - Update show standard
- `DELETE /admin/show-standards/:uid` - Soft delete show standard

#### 🏢 Studios (`/admin/studios`)

- `GET /admin/studios` - List studios with pagination
- `POST /admin/studios` - Create a new studio
- `GET /admin/studios/:uid` - Get studio by UID
- `PATCH /admin/studios/:uid` - Update studio
- `DELETE /admin/studios/:uid` - Soft delete studio

#### 🚪 Studio Rooms (`/admin/studio-rooms`)

- `GET /admin/studio-rooms` - List studio rooms with pagination
- `POST /admin/studio-rooms` - Create a new studio room
- `GET /admin/studio-rooms/:uid` - Get studio room by UID
- `PATCH /admin/studio-rooms/:uid` - Update studio room
- `DELETE /admin/studio-rooms/:uid` - Soft delete studio room

#### 📺 Shows (`/admin/shows`)

- `GET /admin/shows` - List shows with pagination and relations
- `POST /admin/shows` - Create a new show
- `GET /admin/shows/:uid` - Get show by UID
- `PATCH /admin/shows/:uid` - Update show
- `DELETE /admin/shows/:uid` - Soft delete show

#### 🎬 Show MCs (`/admin/show-mcs`)

- `GET /admin/show-mcs` - List show-MC relationships with pagination
- `POST /admin/show-mcs` - Create show-MC assignment
- `GET /admin/show-mcs/:uid` - Get show-MC by UID
- `PATCH /admin/show-mcs/:uid` - Update show-MC assignment
- `DELETE /admin/show-mcs/:uid` - Soft delete show-MC assignment

#### 🌐 Show Platforms (`/admin/show-platforms`)

- `GET /admin/show-platforms` - List show-platform integrations with pagination
- `POST /admin/show-platforms` - Create show-platform integration
- `GET /admin/show-platforms/:uid` - Get show-platform by UID
- `PATCH /admin/show-platforms/:uid` - Update show-platform integration
- `DELETE /admin/show-platforms/:uid` - Soft delete show-platform integration

#### 👥 Studio Memberships (`/admin/studio-memberships`)

- `GET /admin/studio-memberships` - List studio memberships with pagination
- `POST /admin/studio-memberships` - Create studio membership
- `GET /admin/studio-memberships/:uid` - Get studio membership by UID
- `PATCH /admin/studio-memberships/:uid` - Update studio membership
- `DELETE /admin/studio-memberships/:uid` - Soft delete studio membership

#### 📅 Schedules (`/admin/schedules`)

- `GET /admin/schedules` - List schedules with pagination and filtering
- `POST /admin/schedules` - Create a new schedule
- `GET /admin/schedules/:id` - Get schedule by ID
- `PATCH /admin/schedules/:id` - Update schedule (auto-creates snapshot on plan document changes)
- `DELETE /admin/schedules/:id` - Soft delete schedule
- `POST /admin/schedules/:id/validate` - Validate schedule before publish
- `POST /admin/schedules/:id/publish` - Publish schedule to shows
- `POST /admin/schedules/:id/duplicate` - Duplicate schedule
- `GET /admin/schedules/:id/snapshots` - List schedule snapshots
- `POST /admin/schedules/bulk` - Bulk create schedules with partial success handling
- `PATCH /admin/schedules/bulk` - Bulk update schedules with partial success handling
- `GET /admin/schedules/overview/monthly` - Get monthly overview with schedules grouped by client and status

#### 📸 Schedule Snapshots (`/admin/snapshots`)

- `GET /admin/snapshots/:id` - Get schedule snapshot details
- `POST /admin/snapshots/:id/restore` - Restore schedule from snapshot

**Note**: Snapshots are automatically created when schedule plan documents are updated. They provide immutable version history for audit trails and rollback capabilities.

#### 🔐 Backdoor Endpoints (`/backdoor/*`)

Service-to-service API key authenticated endpoints for privileged operations:

- `POST /backdoor/users` - Create user (API key required)
- `PATCH /backdoor/users/:id` - Update user (API key required)
- `POST /backdoor/studio-memberships` - Create studio membership (API key required)
- `POST /backdoor/auth/jwks/refresh` - Manually refresh JWKS cache (API key required)

**Note**: These endpoints are separate from admin endpoints and use API key authentication. See [Server-to-Server Authentication Guide](docs/SERVER_TO_SERVER_AUTH.md) for details.

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

#### MC (Master of Ceremonies)

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
- **Client** ↔ **Material**: One-to-Many (Planned for Phase 3)
- **Platform** ↔ **Material**: One-to-Many (Planned for Phase 3)

### Future Entities (Planned)

The database schema includes comprehensive models for the full livestream production system:

- **Shows**: Core operational records for livestream productions ✅ (Implemented)
- **ShowMC & ShowPlatform**: Show relationship management ✅ (Implemented)
- **Schedules & ScheduleSnapshots**: Collaborative planning system ✅ (Implemented)
- **Materials & MaterialTypes**: Content assets management (Phase 2)
- **Tasks & TaskTemplates**: Workflow automation (Phase 3)
- **Comments**: Collaboration system (Phase 3)
- **Tags & Taggables**: Flexible categorization (Phase 3)
- **Audits**: Complete audit trail (Phase 3)

See the [Business Documentation](docs/BUSINESS.md) for detailed information about the complete system architecture. For implementation status and roadmap, see [Phase 1 Roadmap](docs/roadmap/PHASE_1.md), [Phase 2 Roadmap](docs/roadmap/PHASE_2.md), and [Phase 3 Roadmap](docs/roadmap/PHASE_3.md).

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

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Documentation Index](docs/README.md)** - Complete documentation structure and index
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Complete system architecture
- **[Business Domain](docs/BUSINESS.md)** - Business domain models and relationships
- **[Authentication Guide](docs/AUTHENTICATION_GUIDE.md)** - Phase 1 hybrid authentication guide
- **[Scheduling Architecture](docs/SCHEDULING_ARCHITECTURE.md)** - Scheduling system design
- **[Chunked Upload API](docs/SCHEDULE_UPLOAD_API_DESIGN.md)** ⭐ - API design for large schedule uploads
- **[Manual Testing Guide](manual-test/README.md)** - Manual testing scenarios and workflows
- **[Phase 1 Roadmap](docs/roadmap/PHASE_1.md)** - Phase 1 implementation plan
- **[Phase 2 Roadmap](docs/roadmap/PHASE_2.md)** - Phase 2 implementation plan
- **[Phase 3 Roadmap](docs/roadmap/PHASE_3.md)** - Phase 3 implementation plan

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

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **Prisma** - Next-generation ORM
- **TypeScript** - Typed JavaScript
- **Zod** - TypeScript-first schema validation

---

**Happy Coding! 🚀**

For more detailed information, please refer to the comprehensive documentation in the `docs/` directory.
