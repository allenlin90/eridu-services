import { SetMetadata } from '@nestjs/common';

export const IS_BACKDOOR_KEY = 'is_backdoor_protected';
export const Backdoor = () => SetMetadata(IS_BACKDOOR_KEY, true);
