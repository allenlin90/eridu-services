// common/decorators/admin-protected.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_ADMIN_KEY = 'is_admin_protected';
export const AdminProtected = () => SetMetadata(IS_ADMIN_KEY, true);
