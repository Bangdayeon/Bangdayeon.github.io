import { createProxy } from 'next-i18next/proxy';

import { i18nConfig } from '@/i18n.config';

/**
 * 언어 접두사 처리 — 라이브러리에 맡긴다.
 *
 * Next 16 에서 middleware 가 proxy 로 개명됐고, next-i18next 16 이 그 이름에
 * 맞춘 createProxy 를 내놓는다. hideDefaultLocale 설정에 따라
 *
 *   /dev/mdx-pipeline     → 한국어. 주소 그대로 (내부적으로만 /ko/… 로 간다)
 *   /ko/dev/mdx-pipeline  → /dev/mdx-pipeline 으로 되돌림 (정식 주소는 하나)
 *   /en/dev/mdx-pipeline  → 영어
 *
 * 가 전부 처리된다. 직접 짜면 리라이트와 리다이렉트를 갈라 쓰는 판단이 매번
 * 들어가는데, 언어를 늘릴 때마다 그 판단을 다시 하게 된다.
 */
export const proxy = createProxy(i18nConfig);

export const config = {
  /* 내부 경로와 파일 요청은 건드리지 않는다. /_next 를 안 빼면 번들과 폰트
     요청까지 접두사를 달고 들어가 전부 404 가 된다. 마지막 갈래(점이 들어간
     경로)는 public/ 의 파일들 — favicon · 폰트 · og 이미지.

     `\\.` 의 역슬래시 두 개가 중요하다. 하나만 쓰면 JS 문자열이 그걸 먹어서
     정규식에 `.*.` 이 남고, 그러면 부정 선행(?!)이 사실상 모든 경로에
     걸려서 matcher 가 아무것도 안 잡는다 — proxy 가 통째로 안 도는데
     라우트는 200 을 주므로(=[lng] 가 첫 칸을 삼킨다) 눈치채기 어렵다. */
  matcher: ['/((?!_next/|api/|.*\\.).*)'],
};
