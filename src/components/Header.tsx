'use client';

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
 */
export function Header({
  siteName,
  navOpen,
  onToggleNav,
  navId,
}: {
  siteName: string;
  navOpen: boolean;
  onToggleNav: () => void;
  navId: string;
}) {
  return (
    <header className="border-line bg-surface sticky top-0 z-20 h-14 border-b">
      <div className="grid h-full grid-cols-[1fr_minmax(0,20rem)_1fr] items-center gap-2 px-3">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleNav}
            aria-expanded={navOpen}
            aria-controls={navId}
            aria-label={navOpen ? '메뉴 접기' : '메뉴 펼치기'}
            className={cn(
              'text-ink-muted hover:text-ink hover:bg-surface-subtle grid size-8 shrink-0 place-items-center rounded',
              'focus-visible:outline-focus focus-visible:outline-2'
            )}
          >
            {/* 접힘 방향이 없는 패널 아이콘 — 모바일(위아래)에서도 말이 된다. */}
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
            <LangMenu />
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
