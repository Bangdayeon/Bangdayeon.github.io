import { lng } from 'next/root-params';

import { getT } from 'next-i18next/server';

import { isLocale } from '@/lib/i18n';

import { DEFAULT_LOCALE, type Locale } from '@/i18n.config';

/**
 * 서버 컴포넌트에서 문구를 읽는 창구.
 *
 * getT() 를 그냥 부르면 언어를 요청 헤더(x-i18next-current-language)에서
 * 알아낸다. 헤더를 건드리는 순간 그 페이지는 "요청이 와야 알 수 있는 것"으로
 * 분류돼 정적 생성에서 빠진다 — 쿠키 대신 주소로 언어를 가르기로 한 이유가
 * 통째로 없어진다. 그래서 언제나 언어를 명시해서 넘긴다.
 *
 * 언어는 [lng] 가 루트 레이아웃보다 위에 있어서 root parameter 다. 덕분에
 * 페이지가 아닌 깊숙한 서버 컴포넌트(PostList · ArchiveTimeline …)도 params 를
 * 넘겨받지 않고 여기서 바로 읽는다. 빌드 때 이미 정해지는 값이라 정적 생성도
 * 그대로 산다.
 *
 * 클라이언트 컴포넌트는 이걸 쓸 수 없다 (root-params 는 서버 전용이고, 빌드가
 * 막는다). 그쪽은 next-i18next/client 의 useT() 를 쓴다 — 루트 레이아웃의
 * I18nProvider 가 같은 문구를 이미 심어 두었다.
 */
export async function serverT() {
  return getT(undefined, { lng: await serverLocale() });
}

/**
 * 서버에서 지금 언어만 필요할 때 (날짜 · 수 형식 · 카테고리 라벨 등).
 *
 * root-params 의 lng() 는 그냥 string 이다 — 주소에 무엇이 들어오든 그대로
 * 준다. 그 값을 Locale 로 좁히는 일은 여기서 한 번만 한다. 안 그러면
 * CATEGORY_LABEL[locale] 같은 조회가 부르는 쪽마다 좁히는 코드를 다시 적게
 * 만들고, 빠뜨리면 런타임에서야 undefined 로 터진다 (클라이언트 쪽
 * useLocale() 이 같은 이유로 같은 모양이다).
 */
export async function serverLocale(): Promise<Locale> {
  const value = await lng();
  return value !== undefined && isLocale(value) ? value : DEFAULT_LOCALE;
}
