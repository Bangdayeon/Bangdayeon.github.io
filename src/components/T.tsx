'use client';

import { useT } from 'next-i18next/client';

/**
 * 문구 한 조각.
 *
 * 서버 컴포넌트는 serverT() 로 문구를 읽지만, 서버와 클라이언트 양쪽에서 다
 * 그려지는 컴포넌트(PostList 는 목록 화면에서는 서버, 검색 화면에서는
 * 클라이언트다)는 둘 중 어느 쪽도 쓸 수 없다 — await 는 서버에서만, 훅은
 * 클라이언트에서만 된다.
 *
 * 그래서 문구만 클라이언트 조각으로 떼어낸다. 부르는 쪽은 서버로 남고, 이
 * 한 조각만 클라이언트로 간다. 값이 필요한 자리(aria-label · placeholder)에는
 * 쓸 수 없다 — 그런 자리는 부르는 쪽이 서버든 클라이언트든 한쪽으로 정해진다.
 */
export function T({ k, v }: { k: string; v?: Record<string, unknown> }) {
  const { t } = useT();
  return <>{t(k, v)}</>;
}
