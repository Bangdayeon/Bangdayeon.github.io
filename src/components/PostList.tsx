import type { Post } from '@/types/post';

import { CATEGORY_COLOR } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { type Thumb as ThumbSource, thumbEntry, thumbSrc } from '@/lib/content/image-url';

import { CategoryPath } from '@/components/CategoryPath';
import { LocaleBadge } from '@/components/LocaleBadge';
import { LocaleLink as Link } from '@/components/LocaleLink';
import { Rating } from '@/components/Rating';
import { T } from '@/components/T';

/**
 * 글 목록. 홈 · 카테고리 · 태그 · 아카이브 · 검색 결과가 같은 걸 쓴다.
 *
 * 'use client' 를 붙이지 않았다 — 부르는 쪽이 서버면 서버에서, 클라이언트면
 * 클라이언트에서 렌더된다. onSelect 를 넘길 수 있는 건 클라이언트 쪽뿐이다
 * (검색 결과가 최근 검색을 기록할 때 쓴다).
 *
 * 그래서 문구도 훅(useT)이나 await(serverT) 로 읽지 않는다 — 어느 쪽을 골라도
 * 반대편에서 못 쓴다. 언어를 아는 일은 <T> · <CategoryPath> · <LocaleBadge>
 * 세 조각이 대신 맡는다.
 */
export function PostList({
  posts,
  onSelect,
  emptyText = <T k="post.empty" />,
}: {
  posts: Post[];
  onSelect?: () => void;
  emptyText?: React.ReactNode;
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
            className="hover:bg-surface-subtle focus-visible:outline-focus flex gap-3 rounded-lg px-3 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:gap-4"
          >
            {/* 사진이 있는 글은 첫 장이 왼쪽에 선다. 아직 안 올린 사진이면
                썸네일 없이 지금까지처럼 글자만 선다 (Post.thumb). */}
            {post.thumb && <Thumb thumb={post.thumb} />}

            {/* min-w-0 이 없으면 요약의 truncate 가 안 먹는다 — flex 칸은
                기본이 내용만큼 넓어서 줄어들 줄을 모른다. */}
            <span className="min-w-0 flex-1">
              {/* 카테고리 길 · 날짜 · 원문 배지 · 초고 배지가 한 줄에 선다.
                  깊은 하위 카테고리(개발 / 프론트엔드 / React)까지 오면 375px
                  에서 넘치므로 접는다. */}
              <span className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', CATEGORY_COLOR[post.category].dot)}
                />
                <span className="text-meta text-ink-muted">
                  {/* 하위 카테고리에 있는 글은 DEV / FRONTEND 처럼 폴더 길을 다 보인다.
                      도트 색은 맨 위 칸을 따르므로 색과 글자가 어긋나지 않는다. */}
                  <CategoryPath category={post.category} subs={post.subs} /> · {post.date}
                </span>
                {/* 번역이 없어 원문이 그대로 선 글. 화면 언어와 같으면 아무것도 안 그린다. */}
                <LocaleBadge locale={post.locale} />
                {/* draft 는 dev 에서만 목록에 들어온다 — 프로덕션 산출물엔 없다. */}
                {post.draft && (
                  <span className="text-meta-sm text-warning-ink bg-warning-subtle rounded px-1.5 py-0.5">
                    <T k="post.draft" />
                  </span>
                )}
              </span>

              <span className="text-title-sm text-ink-strong block">{post.title}</span>
              <span className="text-body-sm text-ink-muted mt-0.5 block truncate">
                {post.summary}
              </span>

              {/* 별점은 요약 바로 아래다 — 리뷰에서 요약 다음으로 먼저 보는 값이라
                  태그보다 위에 둔다. 리뷰라도 안 매긴 글이 있어 값이 있을 때만 선다. */}
              {post.rating !== undefined && (
                <span className="mt-1 block">
                  <Rating value={post.rating} />
                </span>
              )}

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
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * 목록 왼쪽의 썸네일 — 본문의 첫 사진이다.
 *
 * 비율은 원본 그대로다. 폭만 정하고 높이는 사진이 정하게 둔다 (잘라서
 * 정사각형으로 맞추면 포스터도 스크린샷도 다 같은 모양이 된다). 다만 세로로
 * 아주 긴 사진(인스타툰 한 장이 8000px 인 식) 하나가 목록 한 칸을 화면 높이만큼
 * 밀어내지 않게 높이에만 상한을 둔다 — 거기 걸린 사진만 아래가 잘리고, 보통
 * 비율(포스터 2:3)은 그대로 선다.
 *
 * 우리 표에 있는 사진은 크기와 대표색까지 알아서, 내려받기 전에도 자리가 잡히고
 * 흰 칸이 번쩍이지 않는다. 밖에 걸린 주소는 그걸 모르므로 폭만 잡아 두고 높이는
 * 사진이 뜰 때 정해진다 — 비율은 똑같이 맞지만 그 줄이 한 번 밀린다.
 *
 * next/image 에 물리지 않는 이유는 <Img> 와 같다 (절대 규칙 8).
 */
function Thumb({ thumb }: { thumb: ThumbSource }) {
  const entry = thumbEntry(thumb);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 절대 규칙 8
    <img
      src={thumbSrc(thumb)}
      // 목록의 썸네일은 바로 옆 제목이 이미 말해 주는 것을 되풀이할 뿐이라
      // 읽어 줄 것이 없다. 뜻이 있는 대체 문구는 본문의 <Img> 가 갖는다.
      alt=""
      aria-hidden="true"
      width={entry?.w}
      height={entry?.h}
      loading="lazy"
      decoding="async"
      style={entry ? { backgroundColor: entry.c } : undefined}
      className="border-line mt-0.5 h-auto max-h-28 w-16 shrink-0 rounded-md border object-cover sm:w-20"
    />
  );
}
