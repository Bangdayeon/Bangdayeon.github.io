import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATEGORIES, categoryLabel, isCategory } from '@/lib/categories';
import { getCategoryNode } from '@/lib/posts';
import { serverLocale } from '@/lib/t';

import { CategoryView } from '@/components/CategoryView';

// 카테고리 6개만 빌드타임에 생성하고 그 외 경로는 404 로 보낸다.
// 그 아래(하위 카테고리 · 글 · 쪽 넘김)는 [...rest] 가 맡는다.
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map(category => ({ category }));
}

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  return { title: categoryLabel(await serverLocale(), [category]) };
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  const node = getCategoryNode(await serverLocale(), [category]);
  if (!node) notFound();

  return <CategoryView node={node} current={1} />;
}
