import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/config/site';

import { getAllPosts, getCategoryTree, getTagCounts } from '@/lib/posts';

import { DEFAULT_LOCALE } from '@/i18n.config';

/**
 * 정적 내보내기에서는 라우트 핸들러가 요청 없이 한 번만 돌아야 한다 —
 * 이 한 줄이 없으면 빌드가 그 자리에서 멈춘다.
 */
export const dynamic = 'force-static';

/**
 * sitemap.xml — 크롤러에게 "이 사이트에 있는 주소는 이것뿐"이라고 알린다.
 *
 * [lng] 밖(app 바로 아래)에 둔다. 언어별로 하나씩 굽는 파일이 아니라 사이트에
 * 하나뿐인 파일이고, [lng] 안에 두면 /ko/sitemap.xml · /en/sitemap.xml 두 장이
 * 나온다 — 검색엔진이 찾는 자리는 /sitemap.xml 하나다.
 *
 * **한국어 주소만 싣는다.** /en/… 은 지금 같은 한국어 본문을 다른 주소로 한 번
 * 더 내놓는 중이라(en 번역이 전부 빈 자리표시자, config/site 의 SHOW_LANG_SWITCH
 * 주석 참고) 실어 보내면 중복 문서로 읽힌다. 번역을 채우면 여기에 alternates
 * (hreflang)를 붙여 두 언어를 짝지어 주면 된다 — 그때가 되어야 의미가 있다.
 *
 * 목록의 출처는 화면과 같다(lib/posts). 글을 쓰면 sitemap 도 따라오고,
 * 손으로 갱신할 곳은 없다.
 *
 * 정적 내보내기에서도 그대로 파일 한 장으로 구워진다 (out/sitemap.xml).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const locale = DEFAULT_LOCALE;

  // draft 는 프로덕션 색인에 애초에 없지만, dev 에서 이 함수를 부르면 섞여
  // 나온다 (lib/posts 주석). 안 쓴 글의 주소를 내보내지 않도록 여기서 막는다.
  const posts = getAllPosts(locale).filter(post => !post.draft);

  /** 가장 최근 글의 날짜 — 목록 성격의 화면은 이 날짜로 갱신을 알린다. */
  const latest = posts[0]?.date;

  const fixed: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/archive'), lastModified: latest, changeFrequency: 'weekly' },
    { url: absoluteUrl('/tags'), lastModified: latest, changeFrequency: 'weekly' },
    { url: absoluteUrl('/about'), changeFrequency: 'yearly' },
  ];

  // 하위 카테고리까지 전부 편다 — 트리의 모든 마디가 주소를 하나씩 갖는다.
  const categories = flatten(getCategoryTree(locale)).map(node => ({
    url: absoluteUrl(node.href),
    lastModified: latest,
    changeFrequency: 'weekly' as const,
  }));

  // 태그는 한글이 섞인다. 주소를 만드는 규칙은 화면과 같아야 한다
  // (tags/page.tsx · PostView 도 encodeURIComponent 를 쓴다).
  const tags = getTagCounts(locale).map(({ tag }) => ({
    url: absoluteUrl(`/tags/${encodeURIComponent(tag)}`),
    lastModified: latest,
    changeFrequency: 'monthly' as const,
  }));

  const entries = posts.map(post => ({
    url: absoluteUrl(`/${post.id}`),
    lastModified: post.date,
    changeFrequency: 'yearly' as const,
    priority: 0.8,
  }));

  return [...fixed, ...categories, ...tags, ...entries];
}

/** 트리를 평평하게 — 부모 다음에 자식. */
function flatten<T extends { children: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap(node => [node, ...flatten(node.children)]);
}
