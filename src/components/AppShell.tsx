'use client';

import { useState } from 'react';

import type { NavNode } from '@/config/nav';
import type { Profile } from '@/config/profile';

import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

const NAV_ID = 'site-nav';

/**
 * 사이트 골격.
 *
 * 접기 버튼은 헤더에, 접히는 대상은 사이드바 — 둘이 형제라서 상태를 들
 * 누군가가 필요하다. 서버 컴포넌트인 layout 은 상태를 못 들기 때문에 이
 * 셸만 클라이언트로 만들고, children 은 prop 으로 그대로 통과시킨다.
 * 그래서 페이지들은 서버 컴포넌트로 남는다.
 *
 * 접힘 상태는 저장하지 않는다 — 새로고침하면 펼친 채로 시작한다.
 */
export function AppShell({
  siteName,
  nav,
  profile,
  views,
  children,
}: {
  siteName: string;
  /** 좌측 메뉴. 카테고리 부분은 콘텐츠 폴더에서 자란다 (config/nav.ts). */
  nav: NavNode[];
  profile: Profile;
  /** 사이트 전체 조회수. 집계 수단이 붙기 전까지는 null 이다 (layout 참고). */
  views: number | null;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(true);

  return (
    <>
      <Header
        siteName={siteName}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen(!navOpen)}
        navId={NAV_ID}
      />

      {/* 3.5rem = 헤더 높이(h-14). Sidebar 의 sticky 기준점과 같은 값이다. */}
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:flex-row">
        <Sidebar id={NAV_ID} open={navOpen} nav={nav} profile={profile} views={views} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
