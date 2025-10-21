# Eridu Services API

A modern, scalable REST API built with NestJS, providing administrative operations for managing users, clients, MCs (Master of Ceremonies), and platforms with comprehensive CRUD functionality.

> **Current Status**: This is the foundation layer of the Eridu Services platform. The current implementation provides basic administrative CRUD operations for core entities. Advanced features like Shows, Studios, Materials, and Task Management are planned for future phases as outlined in the development roadmap.

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

### Relationships
- **User** ↔ **MC**: One-to-One (User can optionally have one MC profile)
- **Client** ↔ **Material**: One-to-Many (Planned for future phases)
- **Platform** ↔ **Material**: One-to-Many (Planned for future phases)

### Future Entities (Planned)
The database schema includes comprehensive models for the full livestream production system:
- **Shows**: Core operational records for livestream productions
- **Studios & StudioRooms**: Physical production facilities
- **Materials & MaterialTypes**: Content assets management
- **Schedules & ScheduleVersions**: Collaborative planning system
- **Tasks & TaskTemplates**: Workflow automation
- **Comments**: Collaboration system
- **Tags & Taggables**: Flexible categorization
- **Memberships**: Role-based access control
- **Audits**: Complete audit trail

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

### ✅ Phase 1: Basic Admin Operations (COMPLETED)
- [x] User management (CRUD operations)
- [x] Client management (CRUD operations)
- [x] MC management (CRUD operations)
- [x] Platform management (CRUD operations)
- [x] ShowType management (CRUD operations)
- [x] ShowStatus management (CRUD operations)
- [x] ShowStandard management (CRUD operations)
- [x] Studio management (CRUD operations)
- [x] Pagination and filtering
- [x] Soft delete functionality
- [x] UID system for external references

### 🚧 Phase 1: Core Production MVP (IN PROGRESS)
- [ ] Studio and StudioRoom management
- [ ] Material and MaterialType management
- [ ] Show management (core livestream records)
- [ ] Relationship management endpoints
- [ ] Tagging system implementation

### ⏳ Phase 2: Scheduling & Planning Workflow (PLANNED)
- [ ] Schedule and ScheduleVersion management
- [ ] Show confirmation workflow
- [ ] Resource conflict detection
- [ ] Collaborative planning features

### ⏳ Phase 3: User Collaboration & Access Control (PLANNED)
- [ ] Membership system implementation
- [ ] Role-based access control
- [ ] Comments system
- [ ] Audit trail implementation
- [ ] Authentication and authorization

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

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Complete system architecture
- **[Module Diagrams](docs/MODULE_DIAGRAMS.md)** - Visual relationship diagrams
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Developer quick reference
- **[Maintenance Guide](docs/DOCUMENTATION_MAINTENANCE.md)** - Documentation upkeep
- **[AI Assistant Guide](docs/AI_ASSISTANT_GUIDE.md)** - AI development guidelines

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/eridu_db"

# Application
NODE_ENV="development"
PORT=3000

# Logging
LOG_LEVEL="info"
```

### Prisma Configuration

The project uses Prisma as the ORM with PostgreSQL. Configuration is in `prisma/schema.prisma`.

## 🚀 Deployment

### Production Build
```bash
# Build the application
pnpm run build

# Start production server
pnpm run start:prod
```

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