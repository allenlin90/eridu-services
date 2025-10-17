# Module Relationship Diagrams

## High-Level Architecture

```mermaid
graph TB
    App[AppModule] --> Admin[AdminModule]
    App --> Config[ConfigModule]
    App --> Logger[LoggerModule]
    
    Admin --> AdminUser[AdminUserModule]
    Admin --> AdminClient[AdminClientModule]
    Admin --> AdminMC[AdminMcModule]
    
    AdminUser --> User[UserModule]
    AdminClient --> Client[ClientModule]
    AdminMC --> MC[McModule]
    
    User --> Prisma[PrismaModule]
    User --> Utility[UtilityModule]
    
    Client --> Prisma
    Client --> Utility
    
    MC --> Prisma
    MC --> Utility
    MC --> CommonServices[CommonServicesModule]
    
    CommonServices --> Prisma
    CommonServices --> UserRepo[UserRepository]
    CommonServices --> ClientRepo[ClientRepository]
    CommonServices --> MCRepo[McRepository]
    
    Prisma --> DB[(PostgreSQL Database)]
```

## Detailed Module Dependencies

```mermaid
graph LR
    subgraph "Admin Layer"
        AdminModule
        AdminUserModule
        AdminClientModule
        AdminMcModule
    end
    
    subgraph "Domain Layer"
        UserModule
        ClientModule
        McModule
    end
    
    subgraph "Infrastructure Layer"
        PrismaModule
        UtilityModule
        CommonServicesModule
    end
    
    subgraph "Common Layer"
        CaseConversionUtil
        EntityResolverService
        HttpExceptionFilter
        ZodValidationPipe
    end
    
    AdminModule --> AdminUserModule
    AdminModule --> AdminClientModule
    AdminModule --> AdminMcModule
    
    AdminUserModule --> UserModule
    AdminClientModule --> ClientModule
    AdminMcModule --> McModule
    
    UserModule --> PrismaModule
    UserModule --> UtilityModule
    
    ClientModule --> PrismaModule
    ClientModule --> UtilityModule
    
    McModule --> PrismaModule
    McModule --> UtilityModule
    McModule --> CommonServicesModule
    
    CommonServicesModule --> PrismaModule
    CommonServicesModule --> UserModule
    CommonServicesModule --> ClientModule
    CommonServicesModule --> McModule
```

## Request Processing Flow

```mermaid
sequenceDiagram
    participant Client
    participant AdminController
    participant AdminService
    participant DomainService
    participant Repository
    participant Database
    
    Client->>AdminController: HTTP Request
    AdminController->>AdminService: Delegate to AdminService
    AdminService->>DomainService: Call Domain Service
    DomainService->>Repository: Database Operation
    Repository->>Database: SQL Query
    Database-->>Repository: Query Result
    Repository-->>DomainService: Entity Data
    DomainService-->>AdminService: Processed Data
    AdminService-->>AdminController: Response Data
    AdminController-->>Client: HTTP Response
```

## Case Conversion Flow

```mermaid
flowchart TD
    API[API Request<br/>snake_case] --> Controller[Admin Controller]
    Controller --> AdminService[Admin Service]
    AdminService --> DomainService[Domain Service]
    DomainService --> CaseConversion[Case Conversion Utility]
    CaseConversion --> Internal[camelCase<br/>Internal Format]
    Internal --> Prisma[Prisma ORM]
    Prisma --> Database[PostgreSQL]
    
    Database --> Prisma
    Prisma --> Response[camelCase<br/>Response Data]
    Response --> Serializer[Zod Serializer]
    Serializer --> APIResponse[API Response<br/>snake_case]
```

## Entity Relationships

```mermaid
erDiagram
    User {
        int id PK
        string uid UK
        string ext_id
        string email UK
        string name
        string profile_url
        json metadata
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    Client {
        int id PK
        string uid UK
        string name
        string contact_person
        string contact_email
        json metadata
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    MC {
        int id PK
        string uid UK
        string name
        string alias_name
        boolean is_banned
        int user_id FK
        json metadata
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    User ||--o{ MC : "has many"
```

## Service Dependencies

```mermaid
graph TD
    subgraph "Admin Services"
        AdminUserService
        AdminClientService
        AdminMcService
    end
    
    subgraph "Domain Services"
        UserService
        ClientService
        McService
    end
    
    subgraph "Infrastructure Services"
        PrismaService
        UtilityService
        EntityResolverService
    end
    
    subgraph "Repositories"
        UserRepository
        ClientRepository
        McRepository
    end
    
    AdminUserService --> UserService
    AdminClientService --> ClientService
    AdminMcService --> McService
    
    UserService --> UserRepository
    UserService --> UtilityService
    
    ClientService --> ClientRepository
    ClientService --> UtilityService
    
    McService --> McRepository
    McService --> UtilityService
    McService --> EntityResolverService
    
    UserRepository --> PrismaService
    ClientRepository --> PrismaService
    McRepository --> PrismaService
    
    EntityResolverService --> UserRepository
    EntityResolverService --> ClientRepository
    EntityResolverService --> McRepository
```

## API Endpoint Structure

```mermaid
graph LR
    subgraph "Admin API Routes"
        UsersAPI["/admin/users"]
        ClientsAPI["/admin/clients"]
        MCsAPI["/admin/mcs"]
    end
    
    subgraph "Controllers"
        AdminUserController
        AdminClientController
        AdminMcController
    end
    
    subgraph "Services"
        AdminUserService
        AdminClientService
        AdminMcService
    end
    
    UsersAPI --> AdminUserController
    ClientsAPI --> AdminClientController
    MCsAPI --> AdminMcController
    
    AdminUserController --> AdminUserService
    AdminClientController --> AdminClientService
    AdminMcController --> AdminMcService
```
