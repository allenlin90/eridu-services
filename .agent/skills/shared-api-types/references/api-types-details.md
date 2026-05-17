# Shared API Types — Detailed References

Extended code examples for Zod schema patterns, Prisma-to-DTO transforms, and polymorphic relation handling.

## Implementation Pattern

### Define Zod Schemas (`schemas.ts`)
Wire format uses `snake_case`:
```typescript
export const userApiResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  created_at: z.string(),
});

export const createUserDtoSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});
```

### Infer Types (`types.ts`)
Always infer from Zod — never duplicate:
```typescript
export type UserApiResponse = z.infer<typeof userApiResponseSchema>;
export type CreateUserDto = z.infer<typeof createUserDtoSchema>;
```

### Backend Usage
```typescript
@Post()
@UsePipes(new ZodValidationPipe(createUserDtoSchema))
create(@Body() body: CreateUserDto) { ... }
```

### Frontend Usage
```typescript
const form = useForm<CreateUserDto>({
  resolver: zodResolver(createUserDtoSchema),
});
```

## Schema Composition Rule

When a schema needs `.omit()`, `.pick()`, `.partial()`, export an unrefined object schema alongside the refined one:
```typescript
export const createStudioShowInputObjectSchema = z.object({ /* fields */ });
export const createStudioShowInputSchema = createStudioShowInputObjectSchema.refine(...);
```
Use refined at API boundaries, base object for form-specific derivations.

## Transform Pattern for Prisma → DTO

### Standard DTO Transform
```typescript
export const taskDto = taskSchema.transform((obj) => ({
  id: obj.uid,                              // uid → id
  created_at: obj.createdAt.toISOString(),   // Date → ISO string
}));
```

### Polymorphic Relation DTO Transform
When Prisma uses a join table (e.g., `TaskTarget`):

1. Entity schema mirrors Prisma include shape (field is `targets`, not `shows`)
2. DTO schema is the wire format (flat `show` field)
3. Transform flattens: `targets[0].show` → top-level `show`

> **Important**: Repository MUST filter join table to correct `targetType`:
> `targets: { where: { targetType: 'SHOW', deletedAt: null }, include: { show: true } }`

> **Note**: Always use `uid` (not `id`) in transforms — Prisma `id` is `bigint`.

## Scoped Actuals and Finance Contracts

- Actuals fields live in owning resource's update DTO, not a separate sub-resource
- Field names must reveal meaning (creator participation ≠ platform stream ≠ show window)
- Monetary reference figures: backend-provided string decimals
- Read-model resources for combined economics, not calculated fields on CRUD DTOs
- `metadata.flags.agreement_snapshot_missing` is advisory; calculators derive from snapshot fields
