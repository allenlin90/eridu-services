# Eridu Services API

A modern, scalable REST API built with NestJS, providing administrative operations for managing users, clients, and MCs (Master of Ceremonies) with comprehensive CRUD functionality.

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
- `PUT /admin/users/:uid` - Update user
- `DELETE /admin/users/:uid` - Soft delete user

#### 🏢 Clients (`/admin/clients`)
- `GET /admin/clients` - List clients with pagination
- `POST /admin/clients` - Create a new client
- `GET /admin/clients/:uid` - Get client by UID
- `PUT /admin/clients/:uid` - Update client
- `DELETE /admin/clients/:uid` - Soft delete client

#### 🎤 MCs (`/admin/mcs`)
- `GET /admin/mcs` - List MCs with pagination
- `POST /admin/mcs` - Create a new MC
- `GET /admin/mcs/:uid` - Get MC by UID
- `PUT /admin/mcs/:uid` - Update MC
- `DELETE /admin/mcs/:uid` - Soft delete MC

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

### Core Entities

#### User
- `id` (Primary Key)
- `uid` (Unique Identifier)
- `ext_id` (External ID)
- `email` (Unique)
- `name`
- `profile_url`
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

#### Client
- `id` (Primary Key)
- `uid` (Unique Identifier)
- `name`
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
- `user_id` (Foreign Key to User)
- `metadata` (JSON)
- `created_at`, `updated_at`, `deleted_at`

### Relationships
- **User** ↔ **MC**: One-to-Many (User can have multiple MCs)

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