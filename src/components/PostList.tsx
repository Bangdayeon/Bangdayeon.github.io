import type { Post } from '@/types/post';

import { CATEGORY_COLOR, categoryPath } from '@/lib/categories';
import { cn } from '@/lib/cn';

import { LocaleLink as Link } from '@/components/LocaleLink';

/**
 * 글 목록. 홈 · 카테고리 · 태그 · 아카이브 · 검색 결과가 같은 걸 쓴다.
 *
 * 'use client' 를 붙이지 않았다 — 부르는 쪽이 서버면 서버에서, 클라이언트면
 * 클라이언트에서 렌더된다. onSelect 를 넘길 수 있는 건 클라이언트 쪽뿐이다
 * (검색 결과가 최근 검색을 기록할 때 쓴다).
 */
export function PostList({
  posts,
  onSelect,
  emptyText = '아직 글이 없다.',
}: {
  posts: Post[];
  onSelect?: () => void;
  emptyText?: string;
}) {
  if (posts.length === 0) {
    return <p className="text-body text-ink-muted py-16 text-center">{emptyText}</p>;
  }

  return (
    <ul className="divide-line-subtle divide-y">
      {posts.map(post => (
        <li key={post.id}>
          <Link
            href={`/${post.id}`}
            onClick={onSelect}
            className="hover:bg-surface-subtle focus-visible:outline-primary block rounded-lg px-3 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            <span className="mb-1 flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', CATEGORY_COLOR[post.category].dot)}
              />
              <span className="text-meta text-ink-muted">
                {/* 하위 카테고리에 있는 글은 DEV / FRONTEND 처럼 폴더 길을 다 보인다.
                    도트 색은 맨 위 칸을 따르므로 색과 글자가 어긋나지 않는다. */}
                {categoryPath(post.category, post.subs)} · {post.date}
              </span>
              {/* draft 는 dev 에서만 목록에 들어온다 — 프로덕션 산출물엔 없다. */}
              {post.draft && (
                <span className="text-meta-sm text-warning-ink bg-warning-subtle rounded px-1.5 py-0.5">
                  초고
                </span>
              )}
            </span>

            <span className="text-title-sm text-ink-strong block">{post.title}</span>
            <span className="text-body-sm text-ink-muted mt-0.5 block truncate">
              {post.summary}
            </span>

            <span className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="text-meta-sm text-ink bg-surface-muted rounded px-1.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
