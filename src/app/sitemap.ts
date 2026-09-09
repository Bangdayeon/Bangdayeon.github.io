import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/config/site';

import { localeHref } from '@/lib/i18n';
import { getAllPosts, getCategoryTree, getPostById, getTagCounts } from '@/lib/posts';

import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n.config';

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
 * **싣는 주소는 한국어판이고, 영어판은 hreflang 으로 짝지어 붙인다.** 한동안은
 * 한국어만 실었다 — en 번역이 빈 자리표시자여서 /en/… 이 같은 본문을 다른
 * 주소로 한 번 더 내놓았기 때문이다. 이제 글마다 영문판이 있으므로 둘은 중복이
 * 아니라 번역이고, alternates 로 그렇다고 말해 준다. 그러면 검색엔진이 어느
 * 쪽을 밀어내는 대신 읽는 사람의 언어에 맞는 쪽을 고른다.
 *
 * **태그에는 붙이지 않는다.** 태그는 글마다 frontmatter 에 적히고 언어별로 따로
 * 집계되는데, 한국어판은 "액션"을 영어판은 "action" 을 쓴다. /tags/액션 과
 * /en/tags/action 은 같은 화면의 두 언어판이 아니라 서로 다른 목록이라
 * hreflang 으로 묶으면 거짓말이 된다. 홈 · 아카이브 · 카테고리 · 글은 언어와
 * 무관하게 주소(id)가 같아서 묶어도 참이다.
 *
 * 목록의 출처는 화면과 같다(lib/posts). 글을 쓰면 sitemap 도 따라오고,
 * 손으로 갱신할 곳은 없다.
 *
 * 정적 내보내기에서도 그대로 파일 한 장으로 구워진다 (out/sitemap.xml).
 */
/**
 * 한 주소의 언어별 짝. 한국어는 접두사가 없고 영어는 /en 이 붙는다
 * (i18n.config 의 hideDefaultLocale — localeHref 가 그 규칙을 안다).
 *
 * **실제로 있는 언어만 넣는다.** 번역이 없는 글은 그 언어에서 주소가 아예
 * 없으므로(lib/content/source 의 pickLocale), 두 언어를 무조건 적으면 없는
 * 주소를 정본 번역이라고 알리게 된다 — 404 를 가리키는 hreflang 이다.
 *
 * 짝이 하나뿐이면 아무것도 주지 않는다. 자기 자신만 가리키는 hreflang 은
 * 아무 말도 하지 않는 것과 같다.
 */
function alternates(path: string, locales: readonly Locale[]) {
  if (locales.length < 2) return undefined;

  return {
    languages: Object.fromEntries(locales.map(lng => [lng, absoluteUrl(localeHref(lng, path))])),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const locale = DEFAULT_LOCALE;

  // 카테고리 트리는 언어마다 다르다 — 맨 위 여섯은 글이 없어도 서지만 하위
  // 카테고리는 그 언어에 글이 있어야 나타난다 (lib/posts 의 getCategoryTree).
  const categoryHrefs = new Map<Locale, Set<string>>(
    LOCALES.map(lng => [lng, new Set(flatten(getCategoryTree(lng)).map(node => node.href))])
  );

  // draft 는 프로덕션 색인에 애초에 없지만, dev 에서 이 함수를 부르면 섞여
  // 나온다 (lib/posts 주석). 안 쓴 글의 주소를 내보내지 않도록 여기서 막는다.
  const posts = getAllPosts(locale).filter(post => !post.draft);

  /** 가장 최근 글의 날짜 — 목록 성격의 화면은 이 날짜로 갱신을 알린다. */
  const latest = posts[0]?.date;

  const fixed: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: latest,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: alternates('/', LOCALES),
    },
    {
      url: absoluteUrl('/archive'),
      lastModified: latest,
      changeFrequency: 'weekly',
      alternates: alternates('/archive', LOCALES),
    },
    {
      url: absoluteUrl('/tags'),
      lastModified: latest,
      changeFrequency: 'weekly',
      alternates: alternates('/tags', LOCALES),
    },
  ];

  // 하위 카테고리까지 전부 편다 — 트리의 모든 마디가 주소를 하나씩 갖는다.
  const categories = flatten(getCategoryTree(locale)).map(node => ({
    url: absoluteUrl(node.href),
    lastModified: latest,
    changeFrequency: 'weekly' as const,
    alternates: alternates(
      node.href,
      LOCALES.filter(lng => categoryHrefs.get(lng)?.has(node.href))
    ),
  }));

  // 태그는 한글이 섞인다. 주소를 만드는 규칙은 화면과 같아야 한다
  // (tags/page.tsx · PostView 도 encodeURIComponent 를 쓴다).
  const tags = getTagCounts(locale).map(({ tag }) => ({
    url: absoluteUrl(`/tags/${encodeURIComponent(tag)}`),
    lastModified: latest,
    changeFrequency: 'monthly' as const,
  }));

  // 글의 id 에는 언어가 안 들어간다 (post-schema: 번역은 같은 글이므로 주소도
  // 하나다). 그래서 두 언어판이 같은 path 를 공유하고 짝지어도 참이다.
  const entries = posts.map(post => ({
    url: absoluteUrl(`/${post.id}`),
    lastModified: post.date,
    changeFrequency: 'yearly' as const,
    priority: 0.8,
    alternates: alternates(
      `/${post.id}`,
      // getPostById 는 이제 다른 언어판으로 대신 세우지 않으므로(pickLocale)
      // null 이 곧 "그 언어에는 이 글이 없다"는 뜻이다.
      LOCALES.filter(lng => getPostById(lng, post.id))
    ),
  }));

  return [...fixed, ...categories, ...tags, ...entries];
}

/** 트리를 평평하게 — 부모 다음에 자식. */
function flatten<T extends { children: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap(node => [node, ...flatten(node.children)]);
}
