import { SetMetadata } from '@nestjs/common';

export const IS_GOOGLE_SHEETS_KEY = 'is_google_sheets';
export const GoogleSheets = () => SetMetadata(IS_GOOGLE_SHEETS_KEY, true);
