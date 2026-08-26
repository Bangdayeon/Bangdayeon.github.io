import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n.config';

/**
 * 링크 주소 만들기.
 *
 * 접두사 처리 자체는 proxy(next-i18next)가 하지만, 그건 "들어오는 요청"에
 * 대한 이야기다. 페이지가 내보내는 <Link href> 는 우리가 직접 만들어야 한다 —
 * next-i18next 는 Link 래퍼를 주지 않는다. 영어를 보는 중에 접두사 없는 주소를
 * 그대로 걸면 그 링크를 누르는 순간 한국어로 튕긴다.
 */

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * 이 언어에서 이 경로의 실제 주소.
 *
 *   localeHref('ko', '/dev')  → '/dev'
 *   localeHref('en', '/dev')  → '/en/dev'
 *   localeHref('en', '/')     → '/en'
 *
 * 페이지 안 앵커(`#day-2026-08-25`)는 그대로 돌려준다 — 언어와 무관하게 같은
 * 페이지의 한 지점이라 접두사를 붙이면 오히려 깨진다.
 */
export function localeHref(locale: string, path: string): string {
  if (path.startsWith('#')) return path;
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/**
 * 바깥 주소에서 언어와 나머지를 가른다. localeHref 의 반대 방향이고,
 * 언어를 바꿀 때(지금 보던 화면의 다른 언어판으로) 쓴다.
 *
 *   splitLocale('/en/dev')  → { locale: 'en', path: '/dev' }
 *   splitLocale('/dev')     → { locale: 'ko', path: '/dev' }
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, head, ...rest] = pathname.split('/');

  if (isLocale(head) && head !== DEFAULT_LOCALE) {
    return { locale: head, path: `/${rest.join('/')}` };
  }

  return { locale: DEFAULT_LOCALE, path: pathname };
}
