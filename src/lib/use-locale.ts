'use client';

import { useT } from 'next-i18next/client';

import { isLocale } from '@/lib/i18n';

import { DEFAULT_LOCALE, type Locale } from '@/i18n.config';

/**
 * 클라이언트에서 지금 언어.
 *
 * I18nProvider 가 주소에서 받은 값을 들고 있다 (루트 레이아웃). i18n.language 는
 * 그냥 string 이라 그대로 쓰면 카테고리 라벨 같은 Record<Locale, …> 조회가 막히고,
 * 부르는 쪽마다 좁히는 코드를 다시 적게 된다.
 *
 * 서버 컴포넌트는 이걸 쓸 수 없다 — 그쪽은 lib/t.ts 의 serverLocale() 이다.
 */
export function useLocale(): Locale {
  const { i18n } = useT();
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}
