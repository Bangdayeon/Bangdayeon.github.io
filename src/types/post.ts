import type { Category } from '@/lib/categories';
import type { Thumb } from '@/lib/content/image-url';

import type { Locale } from '@/i18n.config';

// one post
// when make pipeline, move to frontmatter type, and fix only inside of lib/posts.ts
export type Post = {
  id: string; // category/...subs/slug - never change after published
  category: Category; // by top folders.
  /**
   * 카테고리 아래로 더 판 폴더들 — 하위 카테고리. 없으면 빈 배열.
   * id 에도 그대로 들어간다 (`dev/nextjs/app-router`).
   */
  subs: string[];
  slug: string; // lowercase + '-' (excluding date)
  locale: Locale; // language (...-slug.mdx: ko, ...-slug.en.mdx: en, have same id, same address)
  title: string;
  date: string; // yyyy-mm-dd
  summary: string;
  tags: string[]; // 2~5, normalized value in config/tag-alias.ts
  draft: boolean;
  rating?: number; // 0~5 (0.5), only in review categories
  thumb?: Thumb; // first image in body
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
