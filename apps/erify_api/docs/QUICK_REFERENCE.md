# Quick Reference Guide

## Module Quick Reference

### Core Modules

| Module | Purpose | Key Exports | Dependencies |
|--------|---------|-------------|--------------|
| `AppModule` | Root module, global config | - | ConfigModule, LoggerModule, AdminModule |
| `AdminModule` | Admin operations aggregation | AdminUserModule, AdminClientModule, AdminMcModule | AdminUserModule, AdminClientModule, AdminMcModule |
| `UserModule` | User entity management | UserService | PrismaModule, UtilityModule |
| `ClientModule` | Client entity management | ClientService | PrismaModule, UtilityModule |
| `McModule` | MC entity management | McService | PrismaModule, UtilityModule, CommonServicesModule |

### Admin Modules

| Module | Purpose | Controller | Service | Domain Dependency |
|--------|---------|------------|---------|-------------------|
| `AdminUserModule` | Admin user operations | AdminUserController | AdminUserService | UserModule |
| `AdminClientModule` | Admin client operations | AdminClientController | AdminClientService | ClientModule |
| `AdminMcModule` | Admin MC operations | AdminMcController | AdminMcService | McModule |

### Infrastructure Modules

| Module | Purpose | Key Providers | Used By |
|--------|---------|---------------|---------|
| `PrismaModule` | Database ORM | PrismaService | All domain modules |
| `UtilityModule` | Common utilities | UtilityService | All domain modules |
| `CommonServicesModule` | Shared services | EntityResolverService, UserResolverService | McModule |

## Service Quick Reference

### Domain Services

| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| `UserService` | User CRUD operations | createUser, getUserByUid, updateUser, deleteUser | UserRepository, UtilityService |
| `ClientService` | Client CRUD operations | createClient, getClientById, updateClient, deleteClient | ClientRepository, UtilityService |
| `McService` | MC CRUD operations | createMc, getMcById, updateMc, deleteMc | McRepository, UtilityService, EntityResolverService |

### Admin Services

| Service | Purpose | Key Methods | Domain Dependency |
|---------|---------|-------------|-------------------|
| `AdminUserService` | Admin user operations | createUser, getUserById, updateUser, deleteUser, getUsers | UserService |
| `AdminClientService` | Admin client operations | createClient, getClientById, updateClient, deleteClient, getClients | ClientService |
| `AdminMcService` | Admin MC operations | createMc, getMcById, updateMc, deleteMc, getMcs | McService |

### Infrastructure Services

| Service | Purpose | Key Methods | Dependencies |
|---------|---------|-------------|--------------|
| `PrismaService` | Database operations | $connect, $disconnect, [Model] operations | Database connection |
| `UtilityService` | Common utilities | generateBrandedId | - |
| `EntityResolverService` | UID to ID resolution | resolveEntityId | UserRepository, ClientRepository, McRepository |

## Repository Quick Reference

| Repository | Purpose | Key Methods | Base Class |
|------------|---------|-------------|------------|
| `UserRepository` | User data access | findByUid, findByEmail, findActiveUsers | BaseRepository<User> |
| `ClientRepository` | Client data access | findByUid, findByName, findActiveClients | BaseRepository<Client> |
| `McRepository` | MC data access | findByUid, findByName, findActiveMCs | BaseRepository<MC> |

## API Endpoints Quick Reference

### Users (`/admin/users`)
- `GET /admin/users` - List users (paginated)
- `POST /admin/users` - Create user
- `GET /admin/users/:uid` - Get user by UID
- `PUT /admin/users/:uid` - Update user
- `DELETE /admin/users/:uid` - Soft delete user

### Clients (`/admin/clients`)
- `GET /admin/clients` - List clients (paginated)
- `POST /admin/clients` - Create client
- `GET /admin/clients/:uid` - Get client by UID
- `PUT /admin/clients/:uid` - Update client
- `DELETE /admin/clients/:uid` - Soft delete client

### MCs (`/admin/mcs`)
- `GET /admin/mcs` - List MCs (paginated)
- `POST /admin/mcs` - Create MC
- `GET /admin/mcs/:uid` - Get MC by UID
- `PUT /admin/mcs/:uid` - Update MC
- `DELETE /admin/mcs/:uid` - Soft delete MC

## Data Format Quick Reference

### Input Format (snake_case)
```typescript
// User
{
  name: string;
  ext_id?: string;
  email: string;
  profile_url?: string;
  metadata?: Record<string, unknown>;
}

// Client
{
  name: string;
  contact_person: string;
  contact_email: string;
  metadata?: Record<string, unknown>;
}

// MC
{
  name: string;
  alias_name: string;
  user_id?: string; // User UID
  metadata?: Record<string, unknown>;
}
```

### Output Format (snake_case)
```typescript
// Common fields for all entities
{
  id: string; // UID
  name: string;
  created_at: string;
  updated_at: string;
  // ... entity-specific fields
}
```

## Common Patterns

### Adding a New Entity

1. **Create Domain Module**:
   ```typescript
   // entity/entity.module.ts
   @Module({
     imports: [PrismaModule, UtilityModule],
     providers: [EntityService, EntityRepository],
     exports: [EntityService],
   })
   export class EntityModule {}
   ```

2. **Create Admin Module**:
   ```typescript
   // admin/entities/admin-entity.module.ts
   @Module({
     imports: [EntityModule],
     controllers: [AdminEntityController],
     providers: [AdminEntityService],
     exports: [AdminEntityService],
   })
   export class AdminEntityModule {}
   ```

3. **Add to AdminModule**:
   ```typescript
   @Module({
     imports: [AdminUserModule, AdminClientModule, AdminMcModule, AdminEntityModule],
     exports: [AdminUserModule, AdminClientModule, AdminMcModule, AdminEntityModule],
   })
   export class AdminModule {}
   ```

### Case Conversion Usage

```typescript
// In service methods
const internalData = convertApiInputToInternal(
  data as unknown as Record<string, unknown>,
);

// Use internalData with camelCase properties
const payload: Prisma.EntityCreateInput = {
  uid,
  name: internalData.name as string,
  someField: internalData.someField as string,
};
```

### UID Resolution

```typescript
// For entities with relationships
if (internalData.userId) {
  const userId = await this.entityResolver.resolveEntityId(
    'user',
    internalData.userId as string,
  );
  userRelation = { connect: { id: userId } };
}
```

## Testing Quick Reference

### Unit Test Structure
```typescript
describe('EntityService', () => {
  let service: EntityService;
  let repository: EntityRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityService,
        {
          provide: EntityRepository,
          useValue: mockRepository,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    service = module.get<EntityService>(EntityService);
    repository = module.get<EntityRepository>(EntityRepository);
  });
});
```

### Mock Patterns
```typescript
const mockRepository = {
  create: jest.fn(),
  findByUid: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const mockUtilityService = {
  generateBrandedId: jest.fn().mockReturnValue('entity_123'),
};
```

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Database operations
npm run db:migrate:create
npm run db:migrate:deploy
npm run db:seed
npm run db:studio
```

### Code Generation
```bash
# Generate Prisma client
npm run db:generate

# Format Prisma schema
npm run db:format

# Validate Prisma schema
npm run db:validate
```

## Troubleshooting

### Common Issues

1. **Circular Dependencies**: Use `forwardRef()` or restructure modules
2. **Type Errors**: Ensure proper type casting with `as unknown as Record<string, unknown>`
3. **Test Failures**: Check mock implementations and test data formats
4. **Database Issues**: Verify Prisma schema and migrations

### Debug Tips

1. **Enable Debug Logging**: Set `LOG_LEVEL=debug` in environment
2. **Use Prisma Studio**: `npm run db:studio` for database inspection
3. **Check Module Imports**: Verify all dependencies are properly imported
4. **Validate Schemas**: Use `npm run db:validate` for Prisma schema validation
