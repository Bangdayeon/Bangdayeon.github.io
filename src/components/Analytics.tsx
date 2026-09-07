'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { GOATCOUNTER_CODE } from '@/config/analytics';

/**
 * 조회수 집계 (GoatCounter).
 *
 * 두 가지를 한다 — 집계 스크립트를 심고, 화면이 바뀔 때마다 한 번씩 센다.
 *
 * **왜 <script> 를 JSX 로 안 그리나.** 언어를 바꾸면 [lng] 가 바뀌어 루트
 * 레이아웃이 다시 렌더되는데, 그때 React 가 만든 script 는 브라우저가 실행하지
 * 않는다 (PrefsBoot 주석 참고). 인라인 스크립트는 거기서 type 을 바꿔치기해
 * 피했지만, 이건 바깥에서 받아오는 async 스크립트라 React 19 의 script 호이스팅
 * 까지 얽힌다. 손으로 붙이면 그 전부와 무관해진다.
 *
 * **왜 경로가 바뀔 때 또 세나.** count.js 는 자기가 로드된 그 화면 하나만 센다.
 * Next 의 화면 전환은 문서를 다시 받지 않으므로(클라이언트 내비게이션) 그냥
 * 두면 사이트에 처음 들어온 화면 말고는 아무것도 안 잡힌다. GoatCounter 문서의
 * SPA 안내가 말하는 window.goatcounter.count() 가 그 자리다.
 *
 * 코드가 없으면 아무것도 안 한다 — 로컬 새로고침이 숫자에 섞이지 않는다.
 */

declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string }) => void };
  }
}

export function Analytics() {
  const pathname = usePathname();
  /** 첫 화면은 count.js 가 스스로 센다. 여기서 또 세면 두 번이 된다. */
  const loaded = useRef(false);

  useEffect(() => {
    if (GOATCOUNTER_CODE === '') return;

    if (!loaded.current) {
      loaded.current = true;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://gc.zgo.at/count.js';
      // count.js 는 이 속성을 단 script 태그를 스스로 찾아 보낼 곳을 정한다.
      script.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
      document.head.append(script);
      return;
    }

    // 주소창에 보이는 그대로 센다 — 통계의 경로가 실제 주소와 같아야 한다
    // (한국어는 접두사 없이 /dev, 영어는 /en/dev).
    window.goatcounter?.count?.({ path: location.pathname + location.search });
  }, [pathname]);

  return null;
}
