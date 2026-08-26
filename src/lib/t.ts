import { lng } from 'next/root-params';

import { getT } from 'next-i18next/server';

import { DEFAULT_LOCALE } from '@/i18n.config';

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
  return getT(undefined, { lng: (await lng()) ?? DEFAULT_LOCALE });
}

/** 서버에서 지금 언어만 필요할 때 (날짜 · 수 형식 등). */
export async function serverLocale() {
  return (await lng()) ?? DEFAULT_LOCALE;
}
