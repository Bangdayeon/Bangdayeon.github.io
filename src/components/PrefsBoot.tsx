'use client';

import { useEffect, useLayoutEffect } from 'react';

import { PREFS_BOOT_SCRIPT, restorePrefs } from '@/lib/prefs';

/**
 * 서버에는 레이아웃이 없다. useLayoutEffect 를 그대로 부르면 SSR 마다 경고가
 * 뜨는데, 서버에서는 어느 쪽도 실행되지 않으므로 아무 이펙트나 골라도 된다.
 * 이름을 use- 로 시작해야 rules-of-hooks 가 훅으로 알아본다.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
 *                                        대신 아래 이펙트가 같은 복원을 맡는다.
 *
 * 서버와 클라이언트의 type 이 다르므로 suppressHydrationWarning 이 필요하다 —
 * DOM 에 있는 값(text/javascript)을 그대로 두라는 뜻이다.
 *
 * 클라이언트 컴포넌트여야 한다. 서버 컴포넌트로 두면 소프트 내비게이션 때도
 * 서버에서 렌더돼 typeof window 가 늘 'undefined' 라 실행되는 type 이 나가고,
 * 경고가 그대로 남는다.
 */
export function PrefsBoot() {
  // 언어를 바꾸면 <html> 의 class 가 통째로 날아간다 — 왜 그런지는 restorePrefs
  // 머리말에 있다. 되돌리는 일을 여기 붙이는 이유는 이 컴포넌트가 그때 같이
  // 다시 마운트되기 때문이다 (날아간 <html> 과 한 커밋 안에 있다).
  //
  // useEffect 가 아니라 레이아웃 이펙트다. 이펙트는 페인트 뒤에 도니까 시스템이
  // 라이트인데 다크를 쓰던 화면이 한 프레임 하얗게 번쩍인다. 레이아웃 이펙트는
  // 같은 커밋의 DOM 변경 직후 · 페인트 직전에 돌아 그 틈이 없다.
  useIsomorphicLayoutEffect(restorePrefs, []);

  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }}
    />
  );
}
