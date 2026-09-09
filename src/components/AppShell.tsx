'use client';

import { useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

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
 *
 * 열림 상태가 둘인 이유. 넓은 화면의 좌측 칸은 펴진 채로, 좁은 화면의 서랍은
 * 닫힌 채로 시작해야 한다 — 기본값이 서로 반대다. 불리언 하나로는 어느 한쪽이
 * 반드시 틀리고, 첫 페인트에 화면 폭을 재서 고르는 건 이 저장소가 하지 않는
 * 일이다 (검색 화면이 그래프를 두 벌 실어 보내는 것과 같은 이유 —
 * search/page.tsx). 그래서 둘 다 실어 보내고 어느 쪽을 보일지는 CSS 가 고른다.
 *
 * 예전에는 하나였고 기본값이 '펴짐'이라, 375px 화면은 어느 글을 열든 프로필 ·
 * 카테고리 나무 · 태그 열 개를 다 지나야 본문이 나왔다.
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
  /** md 이상 — 좌측 칸을 폈는가. */
  const [navOpen, setNavOpen] = useState(true);
  /** md 미만 — 덮는 서랍을 열었는가. */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /** ESC 로 닫았을 때 포커스를 되돌릴 자리 (헤더의 서랍 버튼). */
  const drawerToggle = useRef<HTMLButtonElement>(null);

  // 서랍은 화면을 덮으므로 옮겨 간 뒤에도 열려 있으면 안 된다. 링크를 눌러
  // 옮겨 가는 길과 뒤로가기로 돌아오는 길이 모두 여기를 지난다. 지금 서 있는
  // 글의 링크를 눌러 주소가 안 바뀌는 경우만 여기로 안 오는데, 그건 사이드바가
  // onNavigate 로 따로 알린다.
  //
  // effect 가 아니라 렌더 중에 고친다. 주소가 바뀌었다는 건 이미 알고 있는
  // 사실이라 화면에 한 번 그렸다가 되돌릴 이유가 없다 — effect 로 닫으면 서랍이
  // 열린 새 화면이 한 프레임 비친다 (React 의 "Adjusting state when a prop
  // changes"). setState 를 만난 React 는 DOM 을 건드리기 전에 이 컴포넌트만
  // 다시 부른다.
  const pathname = usePathname();
  const [drawnAt, setDrawnAt] = useState(pathname);
  if (drawnAt !== pathname) {
    setDrawnAt(pathname);
    setDrawerOpen(false);
  }

  // 서랍이 열린 동안에만 붙는 것들 — ESC · 배경 스크롤 잠금 · 포커스 옮기기.
  // 바깥 클릭은 막(backdrop)이 직접 받는다. 문서에 리스너를 하나 더 다는
  // 대신, 어차피 뒤를 가리려고 세운 요소에 핸들러를 얹는 편이 짧다.
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDrawerOpen(false);
      // 포커스를 트리거로 되돌린다 — 안 돌리면 키보드 사용자가 문서 처음으로
      // 튄다 (Dropdown 과 같은 이유).
      drawerToggle.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);

    // 뒤의 본문이 같이 굴러다니면 서랍이 떠 있는 판이 아니라 겹친 종이로 읽힌다.
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 포커스를 서랍 안으로 옮기는 일은 Sidebar 가 한다 — 스크롤 위치를 함께
    // 손봐야 하는데(열 때마다 맨 위) 그 요소를 들고 있는 쪽이 거기다.
    // 포커스 트랩은 두지 않는다: 서랍이 헤더 바로 다음이라 탭 순서가 이미
    // 자연스럽고, 손으로 짠 트랩은 화면 하나에 지기엔 무거운 부채다.

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = scroll;
    };
  }, [drawerOpen]);

  return (
    <>
      <Header
        siteName={siteName}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen(!navOpen)}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
        drawerToggleRef={drawerToggle}
        navId={NAV_ID}
      />

      {/* 3.5rem = 헤더 높이(h-14). Sidebar 의 sticky 기준점과 같은 값이다. */}
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:flex-row">
        {/* 서랍 뒤의 막. 눌러서 닫는 자리이자 "뒤는 지금 못 만진다"는 표시다.
            aria-hidden 이라 스크린리더에는 없다 — 닫는 길은 ESC 와 헤더 버튼
            둘이 이미 있고, 막까지 읽히면 셋이 된다.

            겹침 순서: 헤더 z-50 > 서랍 z-40 > 막 z-30 > 본문. 헤더가 맨 위인
            이유는 설정 드롭다운 패널이 헤더 아래(top-14 밑)로 내려와 막과
            겹치기 때문이다 — 헤더가 z-20 이면 열린 설정 메뉴가 막에 덮인다. */}
        {drawerOpen && (
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="bg-overlay animate-overlay-in fixed inset-x-0 top-14 bottom-0 z-30 md:hidden"
          />
        )}

        <Sidebar
          id={NAV_ID}
          open={navOpen}
          drawerOpen={drawerOpen}
          onNavigate={() => setDrawerOpen(false)}
          nav={nav}
          profile={profile}
          views={views}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
