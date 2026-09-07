'use client';

import { PREFS_BOOT_SCRIPT } from '@/lib/prefs';

/**
 * 첫 페인트 전에 저장된 테마 · 팔레트를 <html> 에 되돌리는 인라인 스크립트.
 *
 * 왜 컴포넌트로 감쌌나 — 언어를 바꾸면 주소의 [lng] 가 바뀌고, 루트 레이아웃이
 * 소프트 내비게이션으로 다시 렌더된다. 그때 React 가 <script> 를 DOM 으로 새로
 * 만드는데, 그렇게 꽂힌 스크립트는 브라우저가 실행하지 않는다. 개발 모드는 이걸
 * 경고로 알려 준다 ("Encountered a script tag while rendering React component").
 *
 * 그래서 Next 가이드(preventing-flash-before-hydration)의 처방을 따른다: 서버에서는
 * 실행되는 type 으로, 브라우저에서는 실행되지 않는 데이터 블록 type 으로 낸다.
 *
 *   하드 내비게이션(첫 방문 · 새로고침) — HTML 파싱 중에 그대로 실행된다.
 *   소프트 내비게이션(언어 전환)        — text/plain 이라 아무 일도 하지 않는다.
 *                                        복원할 것도 없다. 테마 class 는 이미
 *                                        <html> 에 붙어 있고 React 는 JSX 가
 *                                        들고 있는 속성(lang)만 건드린다.
 *
 * 서버와 클라이언트의 type 이 다르므로 suppressHydrationWarning 이 필요하다 —
 * DOM 에 있는 값(text/javascript)을 그대로 두라는 뜻이다.
 *
 * 클라이언트 컴포넌트여야 한다. 서버 컴포넌트로 두면 소프트 내비게이션 때도
 * 서버에서 렌더돼 typeof window 가 늘 'undefined' 라 실행되는 type 이 나가고,
 * 경고가 그대로 남는다.
 */
export function PrefsBoot() {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }}
    />
  );
}
