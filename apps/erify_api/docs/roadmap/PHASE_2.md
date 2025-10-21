# Phase 2: Scheduling & Planning Workflow

## Overview
Phase 2 introduces the collaborative planning layer using the "Promotable Draft" model. This phase builds upon the core functions from Phase 1 by adding comprehensive scheduling capabilities, change management, and collaborative planning workflows.

## Core Features

### 1. Scheduling System (Critical Resource)
- **Schedule Management**: Multi-version scheduling with change tracking
- **Schedule Status**: Workflow states (draft, proposed, confirmed, archived, cancelled)
- **Change Management**: Categorized change tracking with approval workflows
- **Version Control**: Complete audit trail for schedule modifications
- **Resource Conflict Detection**: Prevent double-booking of studio resources

### 2. Enhanced Show Management
- **Draft Shows**: Create shows with DRAFT status linked to schedule_id
- **Show Confirmation Service**: Bulk-update Show statuses from DRAFT to CONFIRMED
- **Schedule Integration**: Shows can be part of schedules or standalone
- **Status Transitions**: Proper workflow management for show lifecycle

### 3. Collaborative Planning
- **Client-Studio Collaboration**: Collaborative planning before committing to bookings
- **Approval Workflows**: Client approval for schedule changes
- **Change Tracking**: Complete audit trail for all schedule modifications
- **Resource Allocation**: Studio room and time slot management

### 4. Basic Collaboration Features
- **User Attribution**: Track who created/modified entities
- **Soft Delete**: Data preservation with logical deletion
- **Future Integration**: Material management and comment system (Phase 3)

## Implementation Scope

### CRUD Entities by Admin User
- [ ] Schedule (Critical Resource)
- [ ] ScheduleStatus
- [ ] ScheduleVersion
- [ ] ChangeCategory
- [ ] ChangeType
- [ ] Show (Enhanced with schedule integration)

### Advanced Features
- [ ] Schedule management endpoints for viewing and managing draft shows
- [ ] Validation logic for schedule conflicts and studio room availability
- [ ] Bulk show confirmation from DRAFT to CONFIRMED
- [ ] Change management workflow with client approval
- [ ] Resource conflict detection and prevention

### Integration Points
- [ ] Schedule integration with existing shows
- [ ] Show status transitions (draft → confirmed → live → completed)
- [ ] Client approval workflows for schedule changes
- [ ] Studio resource allocation and conflict detection

### Seed Data
- [ ] ScheduleStatus (draft, proposed, confirmed, archived, cancelled, other)
- [ ] ChangeCategory (CLIENT_REQUESTED, OPERATIONAL, FORCE_MAJEURE)
- [ ] ChangeType (TIME_CHANGE, RESOURCE_CHANGE, SCOPE_CHANGE, etc.)

### Documentation
- [ ] Schedule Management Architecture
- [ ] Change Management Workflow Documentation
- [ ] Resource Conflict Resolution Guide

## Technical Considerations

### Database Design
- Multi-version scheduling with proper foreign key relationships
- Efficient indexing for schedule queries and conflict detection
- Soft delete support for all entities
- Proper foreign key constraints for data integrity

### API Design
- RESTful endpoints following established patterns
- Proper validation with Zod schemas
- Proper error handling with NestJS exceptions
- Pagination support for large datasets
- Snake_case input/output with proper field mapping

### Security
- **Simplified Authentication**: Admin users have full CRUD access, other users read-only
- Input validation and sanitization
- SQL injection prevention via Prisma
- CORS and security headers
- Ready for JWT authentication

### Performance
- Indexed queries for schedule conflicts and resource availability
- Efficient relationship loading with Prisma includes
- Pagination for large result sets
- Soft delete filtering at repository level
- Optimized queries for schedule versioning

## Success Criteria
- Complete scheduling system with multi-version support
- Functional collaborative planning workflow
- Working change management with approval processes
- Resource conflict detection and prevention
- Complete show integration with schedules
- Simplified authentication with admin write, others read-only
- Admin interface for managing all entities
- Proper documentation and testing coverage

## Dependencies
- Phase 1 core entities must be complete and stable
- User management system must be functional
- Studio and show management must be operational
- Basic CRUD patterns must be established
- Simplified authentication system (admin vs read-only)
- Basic JWT token support for user identification

## Timeline & Rollout Strategy

### Phase 2 Implementation
This phase delivers the complete scheduling and planning system. The implementation focuses on:

1. **Scheduling System**: Complete multi-version scheduling with change tracking
2. **Collaborative Planning**: Client-studio collaboration workflows
3. **Resource Management**: Studio room allocation and conflict detection
4. **Basic Collaboration**: Comments and user attribution

### User Access Strategy
- **Admin Users**: Full CRUD access to all resources
- **Other Users**: Read-only access to all resources
- **Future Enhancement**: Advanced authorization control in Phase 3
- **Flexible Rollout**: Features can be enabled/disabled per user type as needed

This approach provides a complete scheduling and planning system while maintaining simplicity in the authentication layer and preparing for advanced authorization control in Phase 3.