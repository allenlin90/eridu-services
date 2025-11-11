# Eridu Services API

A modern, scalable REST API built with NestJS, providing administrative operations for managing users, clients, MCs (Master of Ceremonies), and platforms with comprehensive CRUD functionality.

> **Current Status**: Phase 1 (~90% complete). The current implementation provides comprehensive CRUD operations for core entities (Users, Clients, MCs, Platforms, Studios, StudioRooms, Shows, ShowMCs, ShowPlatforms, and related lookup tables). **Remaining Phase 1 items:** Authentication/authorization system and seed data as outlined in the development roadmap. See [ASSESSMENT_SUMMARY.md](./ASSESSMENT_SUMMARY.md) for detailed status.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
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
- **🏥 Health Checks**: Liveness and readiness probes for load balancers
- **🛡️ Graceful Shutdown**: Production-ready shutdown with request draining
- **📚 OpenAPI Documentation**: Interactive API documentation with Scalar UI

## 🌐 API Endpoints

### Base URL
```
http://localhost:3000
```

### Authentication
Currently, the API is designed for administrative use. Authentication can be added by integrating with the auth service.

### Available Endpoints

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
- `GET /admin/schedules` - List schedules with pagination
- `POST /admin/schedules` - Create a new schedule
- `GET /admin/schedules/:id` - Get schedule by ID
- `PATCH /admin/schedules/:id` - Update schedule
- `DELETE /admin/schedules/:id` - Soft delete schedule
- `POST /admin/schedules/:id/validate` - Validate schedule before publish
- `POST /admin/schedules/:id/publish` - Publish schedule to shows
- `POST /admin/schedules/:id/duplicate` - Duplicate schedule
- `GET /admin/schedules/:id/snapshots` - List schedule snapshots

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

#### Membership
- `id` (Primary Key)
- `uid` (Unique Identifier)
- `user_id` (Foreign Key to User)
- `group_id` (Polymorphic reference)
- `group_type` (client, platform, studio)
- `role` (admin, member, etc.)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

### Relationships
- **User** ↔ **MC**: One-to-One (User can optionally have one MC profile)
- **User** ↔ **Membership**: One-to-Many (User can have multiple memberships)
- **Studio** ↔ **StudioRoom**: One-to-Many (Studio has multiple rooms)
- **Client** ↔ **Show**: One-to-Many (Planned for Phase 1)
- **StudioRoom** ↔ **Show**: One-to-Many (Planned for Phase 1)
- **Client** ↔ **Material**: One-to-Many (Planned for Phase 3)
- **Platform** ↔ **Material**: One-to-Many (Planned for Phase 3)

### Future Entities (Planned)
The database schema includes comprehensive models for the full livestream production system:
- **Shows**: Core operational records for livestream productions (Phase 1) ✅
- **ShowMC & ShowPlatform**: Show relationship management (Phase 1) ✅
- **Schedules & ScheduleSnapshots**: Collaborative planning system (Phase 1) ✅
- **Materials & MaterialTypes**: Content assets management (Phase 2)
- **Tasks & TaskTemplates**: Workflow automation (Phase 3)
- **Comments**: Collaboration system (Phase 3)
- **Tags & Taggables**: Flexible categorization (Phase 3)
- **Audits**: Complete audit trail (Phase 3)

See the [Business Documentation](docs/BUSINESS.md) for detailed information about the complete system architecture.

## 📋 Implementation Status

### ✅ Phase 0: Foundation & Core Setup (COMPLETED)
- [x] Turborepo monorepo setup
- [x] NestJS backend service
- [x] Prisma ORM with PostgreSQL
- [x] TypeScript with strict configuration
- [x] Zod validation and serialization
- [x] Comprehensive testing setup
- [x] Code quality tools (ESLint, Prettier)
- [x] OpenAPI documentation with Scalar UI

### 🚧 Phase 1: Core Functions with Hybrid Auth (IN PROGRESS - ~90% Complete)
- [x] User management (CRUD operations)
- [x] Client management (CRUD operations)
- [x] MC management (CRUD operations)
- [x] Platform management (CRUD operations)
- [x] ShowType management (CRUD operations)
- [x] ShowStatus management (CRUD operations)
- [x] ShowStandard management (CRUD operations)
- [x] Show management (CRUD operations)
- [x] ShowMC management (CRUD operations)
- [x] ShowPlatform management (CRUD operations) ✅
- [x] Studio management (CRUD operations)
- [x] StudioRoom management (CRUD operations)
- [x] StudioMembership management (CRUD operations)
- [x] Pagination and filtering
- [x] Soft delete functionality
- [x] UID system for external references
- [ ] **Authentication & Authorization** (JWT validation + Admin guard) ⚠️
- [ ] **Seed data** (ShowType, ShowStatus, ShowStandard, Membership roles) ⚠️

### ✅ Phase 1: Scheduling & Planning Workflow (COMPLETED)
- [x] Schedule and ScheduleSnapshot management (JSON-based planning with snapshots)
- [x] Per-client validation (room conflicts, MC double-booking within client)
- [x] Bulk operations (bulk create and bulk update schedules)
- [x] Monthly overview (schedules grouped by client and status)
- [x] Client-by-client upload strategy documented
- [x] Publishing workflow (JSON → normalized Show tables with delete + insert strategy)
- ⚠️ Chunked upload service method implemented (Phase 2 feature, no controller endpoint)

### ⏳ Phase 2: Material Management & Advanced Schedule Features (PLANNED)
- [ ] Material and MaterialType management (versioning, platform targeting)
- [ ] ShowMaterial associations
- [ ] **Chunked Upload** for large single-client schedules (>200 shows)
- [ ] **Cross-Client Validation Service** (conflict detection between clients)
- [ ] **CSV Import/Export** service for Google Sheets migration
- [ ] API expand parameter and search capabilities
- [ ] Idempotency handling for show/schedule creation

### ⏳ Phase 3: User Collaboration & Access Control (PLANNED)
- [ ] Advanced role-based access control (polymorphic memberships)
- [ ] Comments system
- [ ] Audit trail implementation
- [ ] Tagging system

### ⏳ Phase 4: Advanced Features & Reporting (PLANNED)
- [ ] Task management system
- [ ] Workflow automation
- [ ] Analytics and reporting
- [ ] Performance optimization

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
- **[Testing Guide](test-payloads/README.md)** - Schedule planning test payloads and workflow
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