import type { Category } from '@/lib/categories';

/**
 * 글 하나. src/data/index.json 의 항목 스키마이기도 하다.
 *
 * 아직 콘텐츠 빌드 도구가 없어서 지금은 lib/posts.fixtures.ts 가 이 모양을
 * 손으로 채운다. 파이프라인이 생기면 frontmatter → 이 타입으로 옮기고
 * lib/posts.ts 속만 바꾼다 (화면 코드는 이 타입만 안다).
 */
export type Post = {
  /** `category/…subs/slug`. 발행 후 바뀌지 않는다 (README 규약). */
  id: string;
  /** 맨 위 폴더가 결정한다. frontmatter 에는 없다. */
  category: Category;
  /**
   * 카테고리 아래로 더 판 폴더들 — 하위 카테고리. 없으면 빈 배열.
   * id 에도 그대로 들어간다 (`dev/nextjs/app-router`).
   */
  subs: string[];
  /** 영문 소문자 + 하이픈. 파일명의 날짜는 뺀 부분. */
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  summary: string;
  /** 2~5개. config/tag-alias.ts 로 정규화된 값. */
  tags: string[];
  draft: boolean;
  /**
   * 이어 읽을 글의 id 목록.
   *
   * frontmatter 필드가 아니다 — 본문의 [[위키링크]] 를 빌드가 읽어 채운다.
   * Obsidian 에서 글을 잇는 행위가 그대로 그래프의 선이 되고, 필수 frontmatter
   * 5개도 늘어나지 않는다. 링크는 한쪽에서만 걸어도 양쪽에 생긴다.
   */
  related: string[];
};

/**
 * 카테고리 트리의 한 마디. 글이 실제로 들어 있는 폴더에서 자란다 —
 * 맨 위 여섯 개는 글이 없어도 서고, 하위 카테고리는 글이 생겨야 나타난다.
 */
export type CategoryNode = {
  /** ['dev', 'nextjs'] */
  segments: string[];
  /** 'dev/nextjs' */
  path: string;
  /** 마지막 칸의 대문자 표기. */
  label: string;
  /** '/dev/nextjs' */
  href: string;
  /** 하위 카테고리 글까지 전부 센 수. */
  count: number;
  children: CategoryNode[];
};

/**
 * 그래프 한 점. 카테고리 허브와 글이 같은 타입을 쓴다.
 *
 * 허브의 id 는 'category:dev' · 'category:dev/frontend' 처럼 접두사를 붙인다 —
 * 글 id 는 'dev/foo' 라 절대 겹치지 않는다.
 */
export type GraphNode = {
  id: string;
  label: string;
  /** 맨 위 카테고리. 하위 허브와 그 글도 여기 색을 물려받는다. */
  category: Category;
  kind: 'category' | 'post';
  /**
   * 허브의 폴더 깊이 — dev 는 1, dev/frontend 는 2. 글은 0.
   * 깊을수록 점과 이름이 작아져서, 크기만 봐도 위계가 읽힌다.
   */
  depth: number;
  /** 누르면 갈 곳. 허브는 /{폴더 길}, 글은 /{id}. */
  href: string;
  /** 허브는 바로 매달린 것의 수, 글은 related 연결 수. 반지름에 쓴다. */
  degree: number;
};

/**
 * 그래프 한 선. 무방향이라 (source, target) 순서에 의미가 없다.
 *
 *   category  카테고리 허브 → 글. 실선. 모든 글이 하나씩 갖는다
 *   related   글 ↔ 글. 점선. frontmatter 에 적은 것만
 */
export type GraphLink = {
  source: string;
  target: string;
  kind: 'category' | 'related';
};

export type Graph = {
  nodes: GraphNode[];
  links: GraphLink[];
};
