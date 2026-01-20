import { cn } from '@eridu/ui/lib/utils';

const platformIcons: Record<string, { path: string; viewBox: string; color: string }> = {
  tiktok: {
    path: 'M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z',
    viewBox: '0 0 16 16',
    color: 'fill-black dark:fill-white',
  },
  shopee: {
    path: 'M4 7l.867 12.143a2 2 0 0 0 2 1.857h10.276a2 2 0 0 0 2 -1.857l.867 -12.143h-16z M8.5 7c0 -1.653 1.5 -4 3.5 -4s3.5 2.347 3.5 4 M9.5 17c.413 .462 1 1 2.5 1s2.5 -.897 2.5 -2s-1 -1.5 -2.5 -2s-2 -1.47 -2 -2c0 -1.104 1 -2 2 -2s1.5 0 2.5 1',
    viewBox: '0 0 24 24',
    color: 'fill-orange-500',
  },
  lazada: {
    path: 'M28.048 14.434c1.041-.555 7.536-4.625 7.772-4.76.02-.012.509-.348 1.156.022.902.486 7.055 4.252 7.31 4.437.439.254.693.717.693 1.225v13.496a1.371 1.371 0 0 1-.786 1.11c-.578.323-15.89 9.936-17.995 11.092-.486.3-1.087.3-1.596.023-2.059-1.202-17.417-10.815-17.995-11.093a1.407 1.407 0 0 1-.786-1.132v-13.52c0-.484.254-.947.647-1.2l7.356-4.46c.37-.209.786-.232 1.156-.024.185.092 6.962 4.53 8.026 4.945 1.573.717 3.539.67 5.042-.161z',
    viewBox: '0 0 64 64',
    color: 'fill-blue-600',
  },
};

export function PlatformIcon({ platform }: { platform: string }) {
  const key = platform?.toLowerCase();
  const icon = platformIcons[key];

  if (!icon)
    return null;

  return (
    <svg
      viewBox={icon.viewBox}
      className={cn('h-3 w-3 mr-1', icon.color)}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d={icon.path} />
    </svg>
  );
}
