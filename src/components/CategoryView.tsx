import type { CategoryNode } from '@/types/post';

import { categoryColor, categoryLabel } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { getPostsIn } from '@/lib/posts';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { PAGE_SIZE, PageNav, pageCount } from '@/components/PageNav';
import { PageTitle } from '@/components/PageTitle';
import { PostList } from '@/components/PostList';

/**
 * 카테고리 한 칸의 글 목록. /{category} · /{category}/{하위} · 쪽 넘김이 전부
 * 이걸 쓴다.
 *
 * 목록에는 그 폴더에 직접 든 글만 나온다 — dev/frontend/react 의 글은
 * react 까지 들어가야 보인다. 폴더를 열면 그 폴더의 내용물이 나오는 것과
 * 같고, 좌측 네비의 (n) 도 같은 수를 센다. 아래로 갈라지는 길은 목록 위의
 * 하위 카테고리 칩과 좌측 네비가 보여 준다.
 */
export function CategoryView({ node, current }: { node: CategoryNode; current: number }) {
  const posts = getPostsIn(node.segments);
  // 하위 카테고리 칩에 붙일 점 색. 맨 위 칸이 정한다.
  const dot = categoryColor(node.segments)?.dot;
  const total = pageCount(posts.length);

  // ['dev', 'nextjs'] → [{ label: 'dev', href: '/dev' }]
  const parents = node.segments.slice(0, -1).map((_, index) => {
    const path = node.segments.slice(0, index + 1);
    return { label: categoryLabel(path), href: `/${path.join('/')}` };
  });

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-10">
      {parents.length > 0 && (
        <nav aria-label="상위 카테고리" className="text-meta text-ink-muted mb-1">
          {parents.map(parent => (
            <span key={parent.href}>
              <Link
                href={parent.href}
                className="hover:text-ink focus-visible:outline-focus rounded focus-visible:outline-2"
              >
                {parent.label}
              </Link>
              <span aria-hidden="true"> / </span>
            </span>
          ))}
        </nav>
      )}

      <PageTitle
        title={node.label}
        meta={`${posts.length}편${total > 1 ? ` · ${current}/${total} 쪽` : ''}`}
      />

      {node.children.length > 0 && (
        /* 하위 카테고리는 좌측 네비에도 있지만, 네비가 접혀 있을 수 있다.
         *
         * 태그 칩과 생김새를 일부러 갈라 둔다 — 둘 다 "이름 + 수"라 모양까지
         * 같으면 같은 종류로 읽힌다. 태그는 알약(rounded-full), 여기는 모서리가
         * 각진 상자에 카테고리 색 점을 달았다. 점은 이 사이트에서 줄곧
         * "이 글이 속한 칸"을 뜻해 왔고, 태그에는 한 번도 붙은 적이 없다.
         * 수를 괄호로 감싸는 것도 좌측 네비의 (n) 과 같은 표기다. */
        <nav aria-label="하위 카테고리" className="mb-6 flex flex-wrap gap-2">
          {node.children.map(child => (
            <Link
              key={child.path}
              href={child.href}
              className="text-meta text-ink border-line hover:border-line-strong hover:bg-surface-subtle focus-visible:outline-focus inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors focus-visible:outline-2"
            >
              {dot && (
                <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', dot)} />
              )}
              {child.label}
              <span className="text-meta-sm text-ink-muted tabular-nums">({child.count})</span>
            </Link>
          ))}
        </nav>
      )}

      <PostList posts={posts.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} />
      <PageNav base={`/${node.path}`} current={current} total={total} />
    </main>
  );
}
