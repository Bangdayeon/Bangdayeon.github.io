import type { Post } from '@/types/post';

import { CATEGORY_COLOR, categoryPath } from '@/lib/categories';
import { cn } from '@/lib/cn';

import { LocaleLink } from '@/components/LocaleLink';
import { MdxContent } from '@/components/MdxContent';
import { PostCards } from '@/components/PostCards';

/**
 * 글 한 편. 라우트가 글 · 본문 · 관련글을 다 찾아 넘겨준다 — 이 컴포넌트는
 * 데이터를 읽지 않는다 (같은 파일에서 목록 화면도 갈라지기 때문이다).
 */
export function PostView({ post, body, related }: { post: Post; body: string; related: Post[] }) {
  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-10">
      <article>
        <header className="border-line mb-8 border-b pb-6">
          <p className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn('size-2 shrink-0 rounded-full', CATEGORY_COLOR[post.category].dot)}
            />
            <span className="text-meta text-ink-muted">
              {/* 하위 카테고리에 있는 글이면 DEV / FRONTEND 처럼 폴더 길을 그대로 보인다. */}
              {categoryPath(post.category, post.subs)} · {post.date}
            </span>
            {post.draft && (
              <span className="text-meta-sm text-warning-ink bg-warning-subtle rounded px-1.5 py-0.5">
                초고
              </span>
            )}
          </p>

          <h1 className="text-title-lg text-ink-strong">{post.title}</h1>
          <p className="text-body text-ink-muted mt-2">{post.summary}</p>

          <ul className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <li key={tag}>
                <LocaleLink
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="text-meta-sm text-ink bg-surface-muted hover:bg-primary-subtle hover:text-primary-ink rounded px-1.5 py-0.5"
                >
                  {tag}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </header>

        <MdxContent source={body} />
      </article>

      {related.length > 0 && (
        <section aria-label="관련 글" className="border-line mt-16 border-t pt-8">
          {/* 손으로 이어 둔 위키링크가 먼저고, 모자라면 태그 · 카테고리로 채운다. */}
          <h2 className="text-title-sm text-ink-strong mb-3">이어 읽기</h2>
          <PostCards posts={related} />
        </section>
      )}
    </main>
  );
}
