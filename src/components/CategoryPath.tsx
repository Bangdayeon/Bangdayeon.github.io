'use client';

import { type Category, categoryPath } from '@/lib/categories';
import { useLocale } from '@/lib/use-locale';

/**
 * 글이 들어 있는 폴더 길 — 'dev' · 'dev / frontend / 상태 관리'.
 *
 * 카테고리 이름은 언어를 탄다 (categories.ts 의 CATEGORY_LABEL). 목록 · 카드 ·
 * 글 머리가 전부 이걸 쓰는데 그중 목록은 서버 · 클라이언트 양쪽에서 그려지므로,
 * 언어를 아는 일을 이 조각 하나에 맡긴다 (T 와 같은 이유다).
 */
export function CategoryPath({ category, subs }: { category: Category; subs: string[] }) {
  return <>{categoryPath(useLocale(), category, subs)}</>;
}
