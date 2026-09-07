import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/config/site';

/**
 * 정적 내보내기에서는 라우트 핸들러가 요청 없이 한 번만 돌아야 한다 —
 * 이 한 줄이 없으면 빌드가 그 자리에서 멈춘다.
 */
export const dynamic = 'force-static';

/**
 * robots.txt — 크롤러에게 어디를 보고 어디를 보지 말지 알린다.
 *
 * sitemap 과 같은 이유로 [lng] 밖에 둔다. 사이트에 하나뿐인 파일이고, 크롤러가
 * 찾는 자리는 /robots.txt 하나다.
 *
 * /en/ 을 막는 이유: 지금 영어 번역이 전부 빈 자리표시자라 /en/… 이 같은
 * 한국어 본문을 다른 주소로 한 번 더 내놓는다 (config/site 의 SHOW_LANG_SWITCH).
 * 중복 문서를 두면 검색엔진이 어느 쪽을 정본으로 볼지 스스로 고르고, 한국어
 * 주소가 밀릴 수 있다. 번역을 채우면 이 줄과 sitemap 의 hreflang 을 함께 푼다.
 *
 * /search 도 막는다 — 검색 결과 화면은 색인할 내용이 아니라 다른 화면으로
 * 가는 통로다(?q= 가 붙는 만큼 주소가 무한히 늘어난다). 그 안의 글은 목록과
 * sitemap 으로 이미 다 닿는다.
 */
export default function robots(): MetadataRoute.Robots {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [`${basePath}/en/`, `${basePath}/search`],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
