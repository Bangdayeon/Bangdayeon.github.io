/** 사이트 명칭. metadata(title)와 헤더 로고 옆 제목이 같은 값을 본다. */
export const SITE_NAME = 'DEVELOPER BANGDY';

export const SITE_DESCRIPTION = "'나' 아카이브";

export const SHOW_LANG_SWITCH: boolean = true;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://bangdayeon.github.io'
).replace(/\/+$/, '');

export function absoluteUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${SITE_URL}${basePath}${path === '/' ? '' : path}`;
}
