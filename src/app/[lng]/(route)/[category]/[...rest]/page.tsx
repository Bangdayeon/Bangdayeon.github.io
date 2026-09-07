import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { CategoryNode, Post } from '@/types/post';

import type { Category } from '@/lib/categories';
import { CATEGORIES, categoryPath, isCategory } from '@/lib/categories';
import {
  getAllPosts,
  getCategoryNode,
  getCategoryTree,
  getPostBody,
  getPostById,
  getPostsIn,
  getRelatedPosts,
} from '@/lib/posts';
import { EMPTY_PARAM, atLeastOne } from '@/lib/static-params';
import { serverLocale } from '@/lib/t';

import { CategoryView } from '@/components/CategoryView';
import { pageCount } from '@/components/PageNav';
import { PostView } from '@/components/PostView';

import type { Locale } from '@/i18n.config';

/**
 * 카테고리 아래의 모든 경로.
 *
 *   /dev/mdx-pipeline          글
 *   /dev/nextjs                하위 카테고리 목록
 *   /dev/nextjs/app-router     하위 카테고리의 글
 *   /dev/page/2                쪽 넘김 (하위도 /dev/nextjs/page/2)
 *
 * 하위 카테고리가 몇 단이 될지 미리 알 수 없어서 한 라우트가 셋을 다 받는다.
 * 대신 어느 쪽인지는 여기서 명시적으로 가른다 — generateStaticParams 가 만든
 * 경로만 존재하므로(dynamicParams = false) 애매한 경로는 애초에 없다.
 */
export const dynamicParams = false;

type Params = { params: Promise<{ category: string; rest: string[] }> };

type Resolved =
  { kind: 'post'; post: Post } | { kind: 'list'; node: CategoryNode; current: number };

function resolve(locale: Locale, category: string, rest: string[]): Resolved | null {
  if (!isCategory(category)) return null;

  // 뒤 두 칸이 page/N 이면 쪽 넘김이다. 'page' 는 하위 카테고리 폴더 이름으로
  // 쓰지 못하게 막아 뒀으므로(lib/post-schema) 글 경로와 겹칠 일이 없다.
  if (rest.length >= 2 && rest[rest.length - 2] === 'page') {
    const node = getCategoryNode(locale, [category, ...rest.slice(0, -2)]);
    if (!node) return null;

    const current = Number(rest[rest.length - 1]);
    // 1쪽은 /{category} · /{category}/{하위} 가 맡는다. 여기로 오면 안 된다.
    if (!Number.isInteger(current) || current < 2) return null;
    if (current > pageCount(getPostsIn(locale, node.segments).length)) return null;

    return { kind: 'list', node, current };
  }

  // 글이 먼저다 — 글의 주소는 발행 뒤 바뀌지 않는다는 약속이 더 무겁다.
  const post = getPostById(locale, [category, ...rest].join('/'));
  if (post) return { kind: 'post', post };

  const node = getCategoryNode(locale, [category, ...rest]);
  return node ? { kind: 'list', node, current: 1 } : null;
}

// [lng] 는 루트 파라미터라 여기서도 serverLocale() 로 읽는다 — 언어마다 글
// 목록도 카테고리 트리도 다르므로 이 함수는 언어별로 한 번씩 돈다.
export async function generateStaticParams() {
  const locale = await serverLocale();
  const params: { category: string; rest: string[] }[] = [];

  for (const post of getAllPosts(locale)) {
    params.push({ category: post.category, rest: [...post.subs, post.slug] });
  }

  const walk = (node: CategoryNode) => {
    const [category, ...rest] = node.segments;

    // 하위 카테고리 목록. 맨 위 카테고리의 1쪽은 [category]/page.tsx 가 맡는다.
    if (rest.length > 0) params.push({ category, rest });

    const total = pageCount(getPostsIn(locale, node.segments).length);
    for (let page = 2; page <= total; page += 1) {
      params.push({ category, rest: [...rest, 'page', String(page)] });
    }

    node.children.forEach(walk);
  };

  getCategoryTree(locale).forEach(walk);

  // 글도 하위 카테고리도 없으면 params 가 빈 배열이다 — 자리표시자 하나를
  // 끼운다. resolve() 가 이 경로를 못 풀어 notFound() 로 떨어진다.
  return atLeastOne(params, { category: CATEGORIES[0], rest: [EMPTY_PARAM] });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await serverLocale();
  const { category, rest } = await params;
  const resolved = resolve(locale, category, rest);
  if (!resolved) return {};

  if (resolved.kind === 'list') {
    const [top, ...subs] = resolved.node.segments;
    return { title: categoryPath(locale, top as Category, subs) };
  }

  const { post } = resolved;
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default async function CategoryRestPage({ params }: Params) {
  const locale = await serverLocale();
  const { category, rest } = await params;

  const resolved = resolve(locale, category, rest);
  if (!resolved) notFound();

  if (resolved.kind === 'list') {
    return <CategoryView node={resolved.node} current={resolved.current} />;
  }

  const body = getPostBody(resolved.post);
  if (body === null) notFound();

  return (
    <PostView
      post={resolved.post}
      body={body}
      related={getRelatedPosts(locale, resolved.post, 4)}
    />
  );
}
