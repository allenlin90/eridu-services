# Show Orchestration Module Architecture

## Overview

The `ShowOrchestrationModule` handles complex show operations involving multiple domain modules (MCs, Platforms, ShowMCs, ShowPlatforms) while maintaining clean architecture and preventing circular dependencies.

## Architecture Benefits

### 1. **Separation of Concerns**
- **ShowModule**: Core show entity management only
- **ShowOrchestrationModule**: Cross-module coordination and complex operations
- **AdminShowController**: Clean API interface using orchestration service

### 2. **Circular Dependency Prevention**
- Core modules only import direct dependencies
- Orchestration modules import multiple domain modules without creating cycles
- Clear dependency hierarchy prevents architectural issues

### 3. **Data Consistency**
- Prisma transactions ensure atomic operations across multiple modules
- Validation happens before transaction execution
- Rollback capability for failed operations

### 4. **Performance Optimization**
- Simple operations bypass orchestration overhead
- Complex operations use optimized transaction logic
- Lazy loading and selective includes based on operation type

## Module Structure

### ShowModule (Core Domain)
```typescript
@Module({
  imports: [
    PrismaModule,
    UtilityModule,
    ClientModule,           // Direct dependency
    StudioRoomModule,       // Direct dependency  
    ShowTypeModule,         // Direct dependency
    ShowStatusModule,       // Direct dependency
    ShowStandardModule,     // Direct dependency
  ],
  providers: [ShowService, ShowRepository],
  exports: [ShowService],
})
export class ShowModule {}
```

### ShowOrchestrationModule (Cross-Module Logic)
```typescript
@Module({
  imports: [
    ShowModule,             // Core show operations
    McModule,              // MC management
    PlatformModule,        // Platform management
    ShowMcModule,          // Show-MC relationships
    ShowPlatformModule,    // Show-Platform relationships
    PrismaModule,          // Direct database access for transactions
  ],
  providers: [ShowOrchestrationService],
  exports: [ShowOrchestrationService],
})
export class ShowOrchestrationModule {}
```

### AdminShowModule (API Layer)
```typescript
@Module({
  imports: [
    ShowOrchestrationModule,  // Primary service for all operations
    UtilityModule,
  ],
  controllers: [AdminShowController],
})
export class AdminShowModule {}
```

## Service Responsibilities

### ShowService (Core Domain)
- Basic show CRUD operations
- DTO transformation and validation
- Time range validation
- Direct database operations

### ShowOrchestrationService (Cross-Module Coordination)
- Complex show creation with MC/platform assignments
- Atomic transactions across multiple modules
- Validation of related entities before operations
- Unified show retrieval with all relations
- Handles both simple and complex operations transparently

### AdminShowController (API Interface)
- HTTP endpoint handling
- Request/response serialization
- Uses orchestration service as primary service
- Maintains same API endpoints with enhanced functionality

## Implementation Pattern

### Controller Pattern
```typescript
@Controller('admin/shows')
export class AdminShowController extends BaseAdminController {
  constructor(
    private readonly showOrchestrationService: ShowOrchestrationService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  async createShow(@Body() body: CreateShowDto) {
    // Orchestration service handles both simple and complex operations
    return this.showOrchestrationService.createShowWithAssignments(body);
  }

  @Get()
  async getShows(@Query() query: PaginationQueryDto) {
    // Always returns complete show data with relations
    return this.showOrchestrationService.getShowsWithRelations(query);
  }
}
```

### Service Pattern
```typescript
@Injectable()
export class ShowOrchestrationService {
  constructor(
    private readonly showService: ShowService,
    private readonly mcService: McService,
    private readonly platformService: PlatformService,
    private readonly showMcService: ShowMcService,
    private readonly showPlatformService: ShowPlatformService,
    private readonly prisma: PrismaService,
  ) {}

  async createShowWithAssignments(dto: CreateShowDto) {
    // Handle both simple and complex show creation
    if (!dto.mcs?.length && !dto.platforms?.length) {
      // Simple case - delegate to core service
      return this.showService.createShowFromDto(dto, this.getDefaultIncludes());
    }
    
    // Complex case - use transaction
    return this.createShowWithTransaction(dto);
  }

  private async createShowWithTransaction(dto: CreateShowDto) {
    // Validate entities exist
    await this.validateMcAndPlatformAssignments(dto);
    
    // Use Prisma transaction for atomic operations
    return this.prisma.$transaction(async (tx) => {
      // Create show
      const show = await this.showService.createShow(dto.showData);
      
      // Create MC assignments
      if (dto.mcs?.length) {
        await this.createMcAssignments(show.id, dto.mcs, tx);
      }
      
      // Create platform assignments  
      if (dto.platforms?.length) {
        await this.createPlatformAssignments(show.id, dto.platforms, tx);
      }
      
      return show;
    });
  }
}
```

## Implementation Checklist

### Phase 1: Core Module Creation
- [ ] **Create ShowOrchestrationModule** - Module with proper imports (ShowModule, McModule, PlatformModule, ShowMcModule, ShowPlatformModule, PrismaModule)
- [ ] **Create ShowOrchestrationService** - Service with constructor injecting all required services (ShowService, McService, PlatformService, ShowMcService, ShowPlatformService, PrismaService)

### Phase 2: Service Implementation
- [ ] **Implement createShowWithAssignments** - Handle both simple and complex show creation with MC/platform assignments
- [ ] **Implement createShowWithTransaction** - Use Prisma transactions for atomic operations across multiple modules
- [ ] **Implement validateMcAndPlatformAssignments** - Validate entities exist before operations
- [ ] **Implement createMcAssignments and createPlatformAssignments** - Methods for relationship creation
- [ ] **Implement getShowsWithRelations** - Unified show retrieval with all relations (MCs, platforms, clients, etc.)
- [ ] **Add getDefaultIncludes method** - Consistent relation loading patterns

### Phase 3: Schema & DTO Updates
- [ ] **Extend CreateShowDto and UpdateShowDto schemas** - Add support for MC and platform assignments (mcs, platforms arrays)
- [ ] **Update show output schema** - Include MC and platform relations in the response
- [ ] **Update showWithRelationsSchema** - Include ShowMC and ShowPlatform relations

### Phase 4: Controller & Module Updates
- [ ] **Update AdminShowController** - Use ShowOrchestrationService instead of ShowService directly
- [ ] **Update AdminShowModule** - Import ShowOrchestrationModule instead of ShowModule
- [ ] **Update AdminModule** - Ensure ShowOrchestrationModule is properly imported

### Phase 5: Supporting Features
- [ ] **Implement proper error handling** - Rollback mechanisms for failed transactions
- [ ] **Add comprehensive test coverage** - Test ShowOrchestrationService including transaction scenarios
- [ ] **Verify circular dependencies** - Ensure ShowModule dependencies are clean and no circular dependencies exist

### Phase 6: Testing & Validation
- [ ] **Test simple show creation** - Verify simple operations bypass orchestration overhead
- [ ] **Test complex show creation** - Verify transaction-based creation with MC/platform assignments
- [ ] **Test show retrieval** - Verify unified retrieval returns complete data with all relations
- [ ] **Test error scenarios** - Verify proper rollback and error handling
- [ ] **Test API compatibility** - Ensure existing API endpoints work without breaking changes

## Current State Analysis

**✅ Already Implemented:**
- `ShowModule` with proper core dependencies
- `ShowService` with comprehensive CRUD operations and DTO transformation patterns
- `ShowMcService` and `ShowPlatformService` for relationship management
- `McService` and `PlatformService` for entity management
- `AdminShowController` and `AdminShowModule` (currently using ShowService directly)

**❌ Missing (Need to Implement):**
- `ShowOrchestrationModule` - doesn't exist yet
- `ShowOrchestrationService` - doesn't exist yet
- Extended DTOs supporting MC/platform assignments
- Transaction-based complex show creation
- Unified show retrieval with all relations

## Key Implementation Considerations

1. **Transaction Safety**: All complex operations must use Prisma transactions for atomicity
2. **Validation First**: Always validate entity existence before creating relationships
3. **Performance**: Simple operations should delegate to core services to avoid overhead
4. **Error Handling**: Implement proper rollback mechanisms for failed operations
5. **API Compatibility**: Maintain existing API endpoints without breaking changes
6. **Type Safety**: Use proper TypeScript types for includes and relations
7. **Testing**: Comprehensive test coverage including edge cases and error scenarios
