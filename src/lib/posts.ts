import type { CategoryNode, Graph, GraphLink, GraphNode, Post } from '@/types/post';

import type { Category } from '@/lib/categories';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { loadBody, loadPosts } from '@/lib/content/source';

import type { Locale } from '@/i18n.config';

/**
 * 글 데이터를 읽는 유일한 창구.
 *
 * 출처(dev 는 src/content 직독, 프로덕션은 src/data/index.json)는 source.ts 가
 * 가린다. 화면은 여기 함수들만 알면 된다.
 *
 * dev 에서는 draft 도 섞여 나온다 — 쓰는 중인 글을 로컬에서 보라고 그렇게 뒀다.
 * 프로덕션 산출물에는 draft 가 애초에 없다.
 *
 * 함수들이 하나같이 언어를 먼저 받는다. 같은 id 의 두 언어판 중 어느 쪽을
 * 세울지가 목록 · 트리 · 그래프 · 태그 수까지 전부 갈라 놓기 때문이다.
 * 기본값을 두지 않는 것도 같은 이유다 — 안 넘기면 타입이 막아 준다. 언어는
 * 주소에 있으므로 부르는 쪽은 serverLocale() 한 줄이면 된다 (lib/t.ts).
 */

/** 전체 글, 최신순. */
export function getAllPosts(locale: Locale): Post[] {
  return loadPosts(locale);
}

export function getPostById(locale: Locale, id: string): Post | null {
  return getAllPosts(locale).find(post => post.id === id) ?? null;
}

/** 글 본문(MDX 원문). 파일이 사라졌으면 null. */
export function getPostBody(post: Post): string | null {
  return loadBody(post);
}

/** 글이 들어 있는 폴더 — ['dev'] 또는 ['dev', 'nextjs']. */
function dirOf(post: Post): string[] {
  return [post.category, ...post.subs];
}

/**
 * 이 폴더 **아래** 글 전부. 하위 카테고리 것까지 포함해 최신순.
 *
 * getPostsIn(['dev']) 은 dev/*.mdx 와 dev/frontend/react/*.mdx 를 함께 준다 —
 * 상위 카테고리는 아래를 다 아우르는 이름이고, 그렇게 안 하면 하위에만 글이
 * 쌓인 카테고리를 눌렀을 때 목록이 텅 빈다.
 *
 * 좌측 네비의 (n) 과 하위 카테고리 칩의 (n) 도 같은 수를 센다 — 어디서 본
 * 숫자든 누르면 그만큼 나온다. 좁혀 보는 길은 하위 카테고리 쪽이 맡는다.
 */
export function getPostsIn(locale: Locale, segments: string[]): Post[] {
  return getAllPosts(locale).filter(post => {
    const dir = dirOf(post);
    return dir.length >= segments.length && segments.every((name, index) => dir[index] === name);
  });
}

/**
 * 카테고리 트리. 맨 위 여섯 개는 글이 없어도 서고, 하위 카테고리는 글이
 * 들어 있는 폴더만 나타난다 — 빈 폴더는 카테고리가 아니라 그냥 빈 폴더다.
 *
 * count 는 그 폴더 아래 글을 전부 센 수다 (getPostsIn 과 같은 기준) — 하위
 * 카테고리 글도 부모에 함께 얹힌다. dev 가 (0) 인데 dev/frontend 가 (7) 이면
 * dev 를 눌러 볼 이유가 없어 보이는데, 실제로는 그 일곱 편이 다 그 아래 있다.
 */
export function getCategoryTree(locale: Locale): CategoryNode[] {
  const paths = new Set<string>(CATEGORIES);
  const counts = new Map<string, number>();

  for (const post of getAllPosts(locale)) {
    const dir = dirOf(post);

    // 글이 든 폴더부터 뿌리까지 한 편씩 얹는다. 마디를 세우는 일도 같은
    // 걸음에서 끝난다 — dev/frontend 에 직속 글이 없어도 그 아래 react 로
    // 내려가는 길은 있어야 한다 (그때 dev/frontend 는 react 의 글 수로 선다).
    for (let depth = 1; depth <= dir.length; depth += 1) {
      const path = dir.slice(0, depth).join('/');
      paths.add(path);
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
  }

  const build = (segments: string[]): CategoryNode => {
    const path = segments.join('/');

    return {
      segments,
      path,
      label: categoryLabel(locale, segments),
      href: `/${path}`,
      count: counts.get(path) ?? 0,
      children: [...paths]
        .filter(
          child => child.startsWith(`${path}/`) && child.split('/').length === segments.length + 1
        )
        .sort()
        .map(child => build(child.split('/'))),
    };
  };

  return CATEGORIES.map(category => build([category]));
}

/** 경로에 해당하는 마디. 없으면 null (라우트가 404 로 보낸다). */
export function getCategoryNode(locale: Locale, segments: string[]): CategoryNode | null {
  let found: CategoryNode | null = null;
  let level = getCategoryTree(locale);

  for (const name of segments) {
    found = level.find(node => node.segments[node.segments.length - 1] === name) ?? null;
    if (!found) return null;
    level = found.children;
  }

  return found;
}

export function getPostsByTag(locale: Locale, tag: string): Post[] {
  return getAllPosts(locale).filter(post => post.tags.includes(tag));
}

/** 연도별 묶음, 최신 연도부터. */
export function getArchive(locale: Locale): { year: string; posts: Post[] }[] {
  const byYear = new Map<string, Post[]>();

  for (const post of getAllPosts(locale)) {
    const year = post.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), post]);
  }

  return [...byYear]
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

/** 태그 → 글 수. 많은 순, 같으면 이름순. */
export function getTagCounts(locale: Locale): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts(locale)) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * 글 아래에 붙일 관련글.
 *
 * 순서가 곧 우선순위다 — 내가 직접 이어 둔 글(위키링크)이 먼저고, 그다음은
 * 태그가 많이 겹치는 글, 그래도 모자라면 같은 카테고리의 최신 글로 채운다.
 * 자동 추천이 손으로 적은 링크를 밀어내지 않게 하려는 순서다.
 */
export function getRelatedPosts(locale: Locale, post: Post, limit = 4): Post[] {
  const all = getAllPosts(locale).filter(candidate => candidate.id !== post.id);
  const picked: Post[] = [];

  const take = (candidates: Post[]) => {
    for (const candidate of candidates) {
      if (picked.length >= limit) return;
      if (picked.some(already => already.id === candidate.id)) continue;
      picked.push(candidate);
    }
  };

  const byId = new Map(all.map(candidate => [candidate.id, candidate]));
  take(post.related.flatMap(id => byId.get(id) ?? []));

  const shared = all
    .map(candidate => ({
      candidate,
      overlap: candidate.tags.filter(tag => post.tags.includes(tag)).length,
    }))
    .filter(entry => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.candidate.date.localeCompare(a.candidate.date))
    .map(entry => entry.candidate);

  take(shared);
  take(all.filter(candidate => candidate.category === post.category));

  return picked;
}

/**
 * 글 그래프.
 *
 * 폴더 트리가 그대로 뼈대가 된다 — 카테고리 여섯 개가 허브로 서고, 하위
 * 카테고리는 그 아래 한 단 작은 허브로 매달리고, 글은 자기가 실제로 들어 있는
 * 폴더에 붙는다 (실선). dev/frontend/react 의 글이라면
 * dev → frontend → react → 글 이 한 줄로 이어진다.
 *
 * 글끼리는 본문의 위키링크로 이어진다 (점선). 선이 두 종류지만 굵기 · 점선으로
 * 구분되고, 실선은 "소속", 점선은 "이어 읽기"라 뜻이 겹치지 않는다.
 *
 * 카테고리당 perCategory 개까지만 올린다 — 전부 올리면 글이 늘수록 그림이
 * 아니라 실타래가 된다. 상한은 맨 위 카테고리 기준이라 하위 카테고리가 몇 개로
 * 갈라지든 그림의 크기는 그대로다. 밀려난 글은 검색과 카테고리 페이지에 있다.
 */
export function getGraph(locale: Locale, perCategory: number): Graph {
  const all = getAllPosts(locale);

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const relatedDegree = new Map<string, number>();

  const chosen = new Map<Category, Post[]>();
  for (const category of CATEGORIES) {
    const posts = rankForGraph(all.filter(post => post.category === category)).slice(
      0,
      perCategory
    );
    if (posts.length > 0) chosen.set(category, posts);
  }

  const picked = [...chosen.values()].flat();
  const included = new Set(picked.map(post => post.id));

  // 글끼리의 선을 먼저 센다 — 노드 반지름이 이 수를 쓴다.
  const seen = new Set<string>();
  for (const post of picked) {
    for (const target of post.related) {
      // 상한 밖으로 밀린 글로 향하는 선은 그리지 않는다. 깨진 참조는 이미
      // 빌드가 걸러 내므로 여기서는 조용히 넘어간다.
      if (!included.has(target)) continue;

      const key = [post.id, target].sort().join(' ');
      if (seen.has(key)) continue;
      seen.add(key);

      links.push({ source: post.id, target, kind: 'related' });
      relatedDegree.set(post.id, (relatedDegree.get(post.id) ?? 0) + 1);
      relatedDegree.set(target, (relatedDegree.get(target) ?? 0) + 1);
    }
  }

  /**
   * 허브는 고른 글이 실제로 들어 있는 폴더와 그 조상들만 세운다. 글이 하나도
   * 안 걸린 하위 카테고리는 그리지 않는다 — 아무것도 안 매달린 점이 된다.
   *
   * degree 는 자기에게 바로 매달린 것의 수(직속 글 + 바로 아래 허브)다.
   * 반지름에만 쓰인다.
   */
  const hubs = new Map<string, { category: Category; degree: number }>();
  const hubId = (path: string) => `category:${path}`;

  for (const post of picked) {
    const dir = [post.category, ...post.subs];
    for (let depth = 1; depth <= dir.length; depth += 1) {
      const path = dir.slice(0, depth).join('/');
      const before = hubs.get(path);
      // 자기 폴더의 글만 센다. 자식 허브 몫은 아래에서 한 번에 얹는다.
      const mine = depth === dir.length ? 1 : 0;
      hubs.set(path, { category: post.category, degree: (before?.degree ?? 0) + mine });
    }
  }

  // 자식 허브도 "매달린 것"이다. 글이 하나도 없는 중간 폴더(dev/frontend)가
  // 점처럼 작아지지 않게, 아래로 갈라지는 수를 degree 에 더한다.
  for (const path of [...hubs.keys()]) {
    const parent = path.split('/').slice(0, -1).join('/');
    const hub = hubs.get(parent);
    if (hub) hub.degree += 1;
  }

  for (const [path, hub] of [...hubs].sort(([a], [b]) => a.localeCompare(b))) {
    const segments = path.split('/');
    const parent = segments.slice(0, -1).join('/');

    nodes.push({
      id: hubId(path),
      label: categoryLabel(locale, segments),
      category: hub.category,
      kind: 'category',
      depth: segments.length,
      href: `/${path}`,
      degree: hub.degree,
    });

    if (parent === '') continue;

    links.push({ source: hubId(parent), target: hubId(path), kind: 'category' });
  }

  for (const post of picked) {
    const path = [post.category, ...post.subs].join('/');

    nodes.push({
      id: post.id,
      label: post.title,
      category: post.category,
      kind: 'post',
      depth: 0,
      href: `/${post.id}`,
      degree: relatedDegree.get(post.id) ?? 0,
    });

    links.push({ source: hubId(path), target: post.id, kind: 'category' });
  }

  return { nodes, links };
}

/**
 * 그래프에 올릴 글을 고르는 순서. 지금은 최신순이다.
 *
 * TODO(조회수): "많이 읽힌 글"로 바꾸려면 이 함수 하나만 갈아끼우면 된다.
 * 다만 지금은 재료가 없다. 선행 작업 세 가지 —
 *
 *   1. 분석 도구 설치 (Plausible · Umami · Vercel Analytics 중 택 1).
 *      README 미결정 항목이라 도구부터 정해야 한다.
 *   2. 집계 API 로 경로별 조회수를 받아오는 스크립트.
 *      scripts/build-index.ts 에서 빌드 때 한 번 호출한다.
 *   3. Post 스키마에 views?: number 추가 → src/data/index.json 에 굽는다.
 *      frontmatter 에는 넣지 않는다. 사람이 적는 값이 아니다.
 *
 * 그 뒤 이 함수는 (b.views ?? 0) - (a.views ?? 0) 로 시작하고, 조회수가 같거나
 * 아직 집계되지 않은 글은 지금처럼 최신순으로 밀어내면 된다.
 */
function rankForGraph(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}
