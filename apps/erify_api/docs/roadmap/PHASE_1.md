
# Phase 1: Core Functions with Simplified Auth

## Overview
Phase 1 establishes the core production functions with simplified authentication where admin users have full CRUD access and other users have read-only access. This phase focuses on essential entities and basic show management without complex scheduling or advanced features.

## Core Features

### 1. Application Infrastructure
- **Configuration Management**: Environment validation, logging, security headers
- **Validation & Serialization**: Zod-based input validation and response serialization
- **Database Integration**: Prisma ORM with PostgreSQL, base repository patterns
- **API Foundation**: RESTful endpoints with consistent error handling and pagination
- **Simplified Authentication**: Admin write access, others read-only

### 2. Core Entity Management
- **User Management**: User accounts with SSO integration support
- **Client Management**: Client organizations and contact information
- **MC Management**: Master of Ceremonies profiles and aliases
- **Platform Management**: Streaming platform configurations and API settings
- **Studio Management**: Studio locations and room configurations
- **Membership Management**: Basic user-group relationships for admin authentication

### 3. Basic Show Management
- **Show Creation**: Direct show creation with CONFIRMED status
- **Show Relationships**: Basic MC assignments and platform integrations
- **Show Types**: Categorization (BAU, campaign, other)
- **Show Status**: Lifecycle management (draft, confirmed, live, completed, cancelled)
- **Show Standards**: Quality tiers (standard, premium) for production levels
- **Note**: Material associations deferred to Phase 3 (requires Material management system)

### 5. Authentication & Authorization (Hybrid Approach)
- **JWT Token Validation**: Validate JWT tokens from `erify_auth` service for user identification only
- **Simple Authorization**: Use Membership model to distinguish admin vs non-admin users
- **Admin Verification**: Check if user has admin membership in ANY context (simplified check)
- **Admin Guard**: Verify JWT + check admin membership existence for write operations
- **Read-Only Access**: Non-admin users get read-only access to all resources
- **Service-to-Service Auth**: API key authentication for internal service communication
- **Deferred to Phase 3**: Complex role hierarchy, context-specific permissions, polymorphic memberships

## Implementation Scope

### App Configuration
  - [x] Logger
  - [x] Pretty print logger in development mode
  - [ ] Graceful shutdown
  - [ ] SSO integration
  - [x] Basic Helmet
  - [x] Basic CORS
  - [ ] OpenAPI 
  - [x] ENV validation
  - Zod validator and serializer
    - [x] Global pipe (input validation)
    - [x] Global interceptor (serializer)
    - [x] http-exception filter (catching zod errors)
    - [x] base repository class
    - [x] Pagination params and response

- Common utils
  - [x] Branded ID generator

- Authentication & Authorization (Hybrid Approach)
  - [ ] JWT token validation from `erify_auth` service for user identification
  - [ ] Simple Membership model for admin verification (basic CRUD)
  - [ ] Admin membership lookup (check if user is admin in ANY context)
  - [ ] Admin guard implementation (JWT + Membership verification)
  - [ ] Read-only access for non-admin users
  - [ ] API key authentication for service-to-service communication
  - [ ] Admin endpoint protection

- CRUD entities by admin user
  - [x] User 
  - [x] Client 
  - [x] MC 
  - [x] Platform 
  - [x] ShowType 
  - [x] ShowStatus 
  - [x] ShowStandard 
  - [ ] Show (High Priority - Direct show creation with CONFIRMED status)
  - [ ] ShowMC (Medium Priority - Show-MC relationships)
  - [ ] ShowPlatform (Medium Priority - Show-platform integrations)
  - [x] Studio 
  - [x] StudioRoom 
  - [ ] Membership (Essential for admin verification - simplified scope)

- Seed data (Required for Show management)
  - [ ] ShowType (bau, campaign, other)
  - [ ] ShowStatus (draft, confirmed, live, completed, cancelled)
  - [ ] ShowStandard (standard, premium)
  - [ ] Membership roles (admin, member)

- Documentation
  - [x] Scheduling Architecture (SCHEDULING_ARCHITECTURE.md)
  - [x] Show Scheduling & Versioning Design Rationale
  - [x] Change Management Workflow Documentation
  - [ ] Authentication Guide (AUTHENTICATION_GUIDE.md)

## Technical Considerations

### Database Design
- Consistent UID-based external identifiers (never expose internal database IDs)
- Soft delete pattern for data preservation
- Proper indexing for performance
- Foreign key constraints for data integrity
- Polymorphic relationships for flexible associations

### API Design
- RESTful endpoints following established patterns
- Consistent validation with Zod schemas
- Proper error handling with NestJS exceptions
- Pagination support for large datasets
- Snake_case input/output with proper field mapping

### Security
- **Hybrid Authentication**: JWT validation for user identification + Membership model for admin verification
- **Admin Write, Non-Admin Read-Only**: Simple authorization pattern
- **Input validation and sanitization**
- **SQL injection prevention via Prisma**
- **CORS and security headers**
- **JWT token validation from erify_auth service**
- **Basic admin verification via Membership lookup**

### Performance
- Indexed queries for common operations
- Efficient relationship loading with Prisma includes
- Pagination for large result sets
- Soft delete filtering at repository level

## Success Criteria
- Complete CRUD operations for core entities (Users, Clients, MCs, Platforms, Studios, StudioRooms)
- Functional direct show creation with CONFIRMED status
- Working show relationships (MCs, platforms)
- JWT token validation from `erify_auth` service for user identification
- Simple Membership model for admin verification
- Admin guard implementation (JWT + Membership verification)
- Hybrid authentication with admin write, others read-only
- Admin interface for managing all entities
- Proper documentation and testing coverage
- Security best practices implemented
- Performance optimizations in place

## Dependencies
- PostgreSQL database setup
- Prisma ORM configuration
- NestJS framework setup
- Environment configuration
- `erify_auth` service running and accessible
- JWT token validation setup
- Simple Membership model for admin verification
- Admin guard implementation using JWT + Membership
- Hybrid authentication system (admin vs read-only)
- Service-to-service authentication setup

## Timeline & Rollout Strategy

### Phase 1 Implementation
This phase delivers the core production functions with hybrid authentication approach. The implementation focuses on:

1. **Core Entities**: Complete CRUD operations for essential entities
2. **Direct Show Management**: Show creation with CONFIRMED status
3. **Resource Assignment**: Direct assignment of MCs and platforms
4. **JWT Validation**: Token validation for user identification
5. **Simple Authorization**: Membership model for admin verification
6. **Service Integration**: Integration with `erify_auth` service for authentication

### User Access Strategy
- **Admin Users**: Full CRUD access to all resources (verified via simple Membership lookup)
- **Other Users**: Read-only access to all resources (authenticated via JWT validation)
- **Authentication**: JWT tokens from `erify_auth` service for user identification
- **Authorization**: Simple Membership model determines admin permissions
- **Service Integration**: API key authentication for internal service communication
- **Future Enhancement**: Advanced authorization control in Phase 3
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed

This approach provides a solid foundation with core functions while maintaining simplicity in the authentication layer and preparing for advanced features in later phases.
