import type { Post } from '@/types/post';

import { CATEGORY_COLOR, categoryPath } from '@/lib/categories';
import { cn } from '@/lib/cn';

import { LocaleLink as Link } from '@/components/LocaleLink';

/**
 * 카드로 늘어놓는 글 목록. 지금은 글 아래 '이어 읽기'가 쓴다.
 *
 * 같은 글을 <PostList> 와 다르게 그리는 이유는 자리가 다르기 때문이다. 목록
 * 화면에서는 세로로 훑으며 고르지만, 이어 읽기는 이미 한 편을 다 읽은 뒤에
 * 곁들여 보는 것이라 네 칸이 한눈에 들어오는 편이 낫다. 그래서 태그를 빼고
 * 제목 · 요약을 두 줄로 잘라 카드 높이를 고르게 맞춘다 — 여기서 고를 거리는
 * "무엇에 관한 글인가"까지고, 그 이상은 들어가서 읽으면 된다.
 */
export function PostCards({ posts }: { posts: Post[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {posts.map(post => (
        <li key={post.id} className="grid">
          <Link
            href={`/${post.id}`}
            className={cn(
              'border-line bg-surface rounded-lg border p-4',
              'hover:border-line-strong hover:bg-surface-subtle transition-colors',
              'focus-visible:outline-primary focus-visible:outline-2 focus-visible:-outline-offset-2',
              // 요약이 짧은 카드도 옆 카드와 같은 높이로 선다.
              'flex flex-col'
            )}
          >
            <span className="mb-1.5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', CATEGORY_COLOR[post.category].dot)}
              />
              <span className="text-meta-sm text-ink-muted truncate">
                {categoryPath(post.category, post.subs)} · {post.date}
              </span>
              {/* draft 는 dev 에서만 목록에 들어온다 — 프로덕션 산출물엔 없다. */}
              {post.draft && (
                <span className="text-meta-sm text-warning-ink bg-warning-subtle shrink-0 rounded px-1.5 py-0.5">
                  초고
                </span>
              )}
            </span>

            <span className="text-title-sm text-ink-strong line-clamp-2 block">{post.title}</span>
            <span className="text-body-sm text-ink-muted mt-1 line-clamp-2 block">
              {post.summary}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
