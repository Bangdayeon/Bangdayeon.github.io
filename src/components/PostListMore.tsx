'use client';

import { useEffect, useRef, useState } from 'react';

import { useT } from 'next-i18next/client';

import type { Post } from '@/types/post';

import { PostList } from '@/components/PostList';

/**
 * 목록 + 더보기.
 *
 * 누를 때마다 step 편씩 더 편다. 다음 쪽으로 넘어가지 않는 이유는 홈이 "요즘
 * 뭘 썼나" 를 훑는 자리이기 때문이다 — 읽던 자리를 잃지 않고 아래로 계속
 * 이어지는 편이 맞다. 쪽 넘김이 필요한 곳(카테고리 · 태그)은 <PageNav> 가
 * 그대로 맡는다.
 *
 * 글은 처음부터 전부 들고 있다. 정적 내보내기라 더 받아 올 서버가 없고,
 * 어차피 빌드 시점에 다 아는 값이라 나눠 보내 봐야 왕복만 생긴다. 대신
 * 글이 늘면 이 페이지의 페이로드도 같이 는다 — 수백 편이 되면 그때는
 * 쪽 넘김으로 바꿀 것.
 */
export function PostListMore({ posts, step = 10 }: { posts: Post[]; step?: number }) {
  const { t } = useT();
  const [visible, setVisible] = useState(step);

  const listRef = useRef<HTMLDivElement>(null);
  /** 이번 렌더에서 포커스를 옮길 자리. 누른 직후에만 값이 있다. */
  const focusAt = useRef<number | null>(null);

  // 다 펼치면 버튼이 사라진다. 그때 포커스가 <body> 로 떨어지면 키보드 · 스크린
  // 리더 사용자는 방금 어디에 있었는지를 잃는다. 그래서 새로 열린 첫 글로
  // 옮긴다 — 버튼이 남아 있을 때도 "무엇이 늘었는지" 를 바로 짚어 준다.
  useEffect(() => {
    const index = focusAt.current;
    if (index === null) return;
    focusAt.current = null;

    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>('li a[href]');
    links?.[index]?.focus();
  }, [visible]);

  const rest = posts.length - visible;

  return (
    <div ref={listRef}>
      <PostList posts={posts.slice(0, visible)} />

      {rest > 0 && (
        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              focusAt.current = visible;
              setVisible(visible + step);
            }}
            className="text-meta text-ink hover:bg-surface-subtle border-line focus-visible:outline-focus rounded-lg border px-3 py-1.5 focus-visible:outline-2"
          >
            {t('home.more')}
          </button>
        </p>
      )}
    </div>
  );
}
