'use client';

import { useT } from 'next-i18next/client';

import { SHOW_LANG_SWITCH } from '@/config/site';

import { cn } from '@/lib/cn';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { Logo } from '@/components/Logo';
import { SearchLauncher } from '@/components/SearchLauncher';
import { LangMenu, MobileSettingsMenu, SettingsMenu } from '@/components/SettingsControls';

/**
 * 화면 전체 폭 헤더.
 *
 * 좌: 사이드바 토글 + 로고 + 제목(홈 링크) / 중: 검색바 / 우: 설정.
 *
 * 가운데 칸만 minmax(0,20rem) 이라 양옆 1fr 이 같은 폭을 가져간다 — 검색바가
 * 사이드바 폭과 무관하게 화면 한가운데에 서고, 좁은 화면에서는 좌우 내용에
 * 자리를 내주며 저 혼자 줄어든다.
 *
 * 네비 버튼은 둘이다. 넓은 화면은 좌측 칸을 접었다 펴고, 좁은 화면은 덮는
 * 서랍을 열었다 닫는다. 같은 메뉴를 가리키지만(aria-controls 가 같은 id)
 * 여는 방식도 기본값도 달라 aria-expanded 가 서로 다른 값을 말해야 한다.
 * 그래서 버튼 하나에 상태 둘을 물리지 않고, 아래 설정 메뉴와 똑같이 둘을 다
 * 실어 보낸 뒤 display 로 하나만 남긴다 — 보이지 않는 쪽은 접근성 트리에서도
 * 빠지므로 스크린리더에도 버튼은 하나다.
 */
export function Header({
  siteName,
  navOpen,
  onToggleNav,
  drawerOpen,
  onToggleDrawer,
  drawerToggleRef,
  navId,
}: {
  siteName: string;
  navOpen: boolean;
  onToggleNav: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  /** ESC 로 서랍을 닫았을 때 포커스가 돌아올 자리. */
  drawerToggleRef: React.Ref<HTMLButtonElement>;
  navId: string;
}) {
  const { t } = useT();

  return (
    <header className="border-line bg-surface sticky top-0 z-50 h-14 border-b">
      {/* 양옆 1fr 로 검색바를 화면 한가운데 세우는 건 넓은 화면의 호사다. 좁은
          화면에서는 그 대칭 때문에 가운데에 195px 밖에 안 남으므로, 좌우가 제
          몫만 가져가고 나머지를 검색바가 다 쓰게 한다. */}
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 md:grid-cols-[1fr_minmax(0,20rem)_1fr]">
        <div className="flex min-w-0 items-center gap-1">
          {/* 넓은 화면 — 좌측 칸 접기 */}
          <button
            type="button"
            onClick={onToggleNav}
            aria-expanded={navOpen}
            aria-controls={navId}
            aria-label={navOpen ? t('nav.menuCollapse') : t('nav.menuExpand')}
            className={cn(
              'text-ink-muted hover:text-ink hover:bg-surface-subtle hidden size-8 shrink-0 place-items-center rounded md:grid',
              'focus-visible:outline-focus focus-visible:outline-2'
            )}
          >
            {/* 접힘 방향이 없는 패널 아이콘 — 칸이 좁아졌다 넓어진다는 말이다. */}
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
              <rect
                x="1.6"
                y="2.6"
                width="12.8"
                height="10.8"
                rx="2.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path d="M6.4 2.6v10.8" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>

          {/* 좁은 화면 — 덮는 서랍 열기 */}
          <button
            ref={drawerToggleRef}
            type="button"
            onClick={onToggleDrawer}
            aria-expanded={drawerOpen}
            aria-controls={navId}
            aria-label={drawerOpen ? t('nav.menuClose') : t('nav.menuOpen')}
            className={cn(
              'text-ink-muted hover:text-ink hover:bg-surface-subtle grid size-8 shrink-0 place-items-center rounded md:hidden',
              'focus-visible:outline-focus focus-visible:outline-2'
            )}
          >
            {/* 옆에서 밀려 나오는 판이라 아이콘도 줄 세 개고, 열린 동안은 닫는
                X 로 바뀐다. 패널 아이콘은 "접었다 편다"는 말이라 여기 안 맞는다. */}
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="size-4"
            >
              {drawerOpen ? (
                <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" />
              ) : (
                <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
              )}
            </svg>
          </button>

          <Link
            href="/"
            className={cn(
              'text-ink-strong flex min-w-0 items-center gap-2 rounded px-1 py-1',
              'focus-visible:outline-focus focus-visible:outline-2'
            )}
          >
            <Logo className="size-5 shrink-0" />
            <span className="text-title-sm hidden truncate md:inline">{siteName}</span>
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <SearchLauncher />
        </div>

        <div className="flex items-center justify-end gap-1">
          <div className="hidden items-center gap-1 md:flex">
            {SHOW_LANG_SWITCH && <LangMenu />}
            <SettingsMenu />
          </div>
          <div className="md:hidden">
            <MobileSettingsMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
