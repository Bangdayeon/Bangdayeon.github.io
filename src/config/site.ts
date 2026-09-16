import type { Locale } from '@/i18n.config';

export const SITE_NAME: Record<Locale, string> = {
  ko: '개발자 방디',
  en: 'DEVELOPER BANGDY',
};

export const SITE_DESCRIPTION: Record<Locale, string> = {
  ko: '내 아카이브 공간 만들기',
  en: "An archive of 'me'",
};

export const SHOW_LANG_SWITCH: boolean = true;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://bangdayeon.github.io'
).replace(/\/+$/, '');

export function absoluteUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${SITE_URL}${basePath}${path === '/' ? '' : path}`;
}
