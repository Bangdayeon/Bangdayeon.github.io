'use client';

import { useSyncExternalStore } from 'react';

import { useRouter } from 'next/navigation';

import { useT } from 'next-i18next/client';

import { SHOW_LANG_SWITCH } from '@/config/site';

import { cn } from '@/lib/cn';
import { isLocale, localeHref, splitLocale } from '@/lib/i18n';
import {
  type Palette,
  SERVER_PALETTE,
  SERVER_THEME,
  type Theme,
  applyPalette,
  applyTheme,
  readPalette,
  readTheme,
  subscribePrefs,
} from '@/lib/prefs';

import { Dropdown } from '@/components/Dropdown';

import { DEFAULT_LOCALE, type Locale } from '@/i18n.config';

/**
 * 헤더 우측 설정 — 언어 · 테마 · 색상.
 *
 * 데스크톱은 드롭다운 두 개(언어 / 설정), 모바일은 톱니 하나에 셋 다 넣는다
 * (375px 에 로고 · 검색 · 드롭다운 둘을 같이 세우면 제목부터 뭉갠다).
 *
 * 설정 드롭다운의 트리거는 현재 값이 아니라 "설정"으로 고정한다. 현재 값을
 * 드러내면 테마가 system 일 때 버튼에 "시스템"만 떠서, 무엇에 대한 메뉴인지
 * 열어 보기 전에는 알 수 없다. 언어는 값 자체가 곧 이름이라 그대로 둔다.
 *
 * 현재 값 표시는 JS 상태가 아니라 <html> 을 보는 CSS variant 가 한다
 * (theme-dark:… · palette-soft:… 처럼). 테마 · 팔레트는 head 인라인 스크립트가
 * 첫 페인트 전에 class 를 복원하고, 언어는 서버가 <html lang> 에 박아 보내므로
 * 새로고침 직후에도 틀린 값이 잠깐 비치지 않는다. JS 로 읽은 값은 aria-pressed 와
 * 잠금 판정에만 쓴다.
 *
 * 언어만 저장하지 않고 이동한다 — 주소가 곧 언어다 (useSwitchLocale).
 */

type Option<T extends string> = {
  value: T;
  /** 로케일 키. 문구는 렌더 시점에 t() 가 채운다. */
  key: string;
  /** 패널에서 현재 값을 칠하는 클래스. */
  active: string;
  /** 트리거에서 이 라벨만 보이게 하는 클래스. 트리거에 현재 값을 세우는 목록만 갖는다. */
  show?: string;
  /** 이 칸을 잠그는 팔레트들. 키보드 가드가 본다 (포인터는 아래 lock 이 막는다). */
  lockedIn?: readonly Palette[];
  /** 같은 잠금을 CSS 로 거는 클래스. lockedIn 과 짝이다 — 왜 둘인지는 LOCK_* 주석. */
  lock?: string;
};

/* 잠금은 CSS 가 건다. disabled 속성은 JS 를 기다려야 하고, 그러면 하이드레이션
   전 한 프레임 동안 못 고르는 칸이 멀쩡해 보인다 (아래 OptionList 주석).

   그래서 잠금이 두 벌이다 — 화면은 이 클래스가, 키보드는 lockedIn 을 보는
   onClick 가드가 막는다. 클래스는 문자열 상수여야 한다. Tailwind 는 소스를
   글자로 훑어서 유틸리티를 만들기 때문에, 팔레트 이름을 템플릿으로 조립하면
   그 클래스가 CSS 에 아예 생성되지 않는다. */
const LOCK_NEON = 'palette-neon:pointer-events-none palette-neon:opacity-40';
const LOCK_RETRO = 'palette-retro:pointer-events-none palette-retro:opacity-40';

const THEME_OPTIONS: readonly Option<Theme>[] = [
  // 시스템은 양쪽 다 막는다 — OS 가 무엇을 고르든 그 팔레트가 못 견디는
  // 모드로 갈 수 있어서다. 나머지 둘은 서로 반대쪽 팔레트에만 잠긴다.
  {
    value: 'system',
    key: 'settings.system',
    active: 'theme-system:bg-primary-subtle theme-system:text-primary-ink',
    lockedIn: ['neon', 'retro'],
    lock: `${LOCK_NEON} ${LOCK_RETRO}`,
  },
  {
    value: 'light',
    key: 'settings.light',
    active: 'theme-light:bg-primary-subtle theme-light:text-primary-ink',
    lockedIn: ['neon'],
    lock: LOCK_NEON,
  },
  {
    value: 'dark',
    key: 'settings.dark',
    active: 'theme-dark:bg-primary-subtle theme-dark:text-primary-ink',
    lockedIn: ['retro'],
    lock: LOCK_RETRO,
  },
];

const LANG_OPTIONS: readonly Option<Locale>[] = [
  {
    value: 'ko',
    key: 'settings.korean',
    active: 'lang-ko:bg-primary-subtle lang-ko:text-primary-ink',
    show: 'hidden lang-ko:inline',
  },
  {
    value: 'en',
    key: 'settings.english',
    active: 'lang-en:bg-primary-subtle lang-en:text-primary-ink',
    show: 'hidden lang-en:inline',
  },
];

type PaletteOption = {
  value: Palette;
  key: string;
  /** 고른 원에 테를 두르는 클래스. */
  active: string;
  /**
   * 원 안쪽. 세 원이 세 팔레트를 동시에 보여줘야 하므로 활성 팔레트를 따라가는
   * 토큰(--color-cat-*)을 쓸 수 없다 — colors.css 의 --swatch-* 는 그러라고
   * 따로 둔 상수다. 단색 점은 "파란색 테마"로 읽히지 판으로 읽히지 않아서
   * 대표 3색을 원 하나에 돌린다.
   */
  swatch: string;
};

const swatch = (name: Palette) =>
  `conic-gradient(var(--swatch-${name}-1), var(--swatch-${name}-2), var(--swatch-${name}-3), var(--swatch-${name}-1))`;

const PALETTE_OPTIONS: readonly PaletteOption[] = [
  {
    value: 'vivid',
    key: 'settings.vivid',
    active: 'palette-vivid:ring-2',
    swatch: swatch('vivid'),
  },
  { value: 'soft', key: 'settings.soft', active: 'palette-soft:ring-2', swatch: swatch('soft') },
  { value: 'neon', key: 'settings.neon', active: 'palette-neon:ring-2', swatch: swatch('neon') },
  {
    value: 'retro',
    key: 'settings.retro',
    active: 'palette-retro:ring-2',
    swatch: swatch('retro'),
  },
];

function Caret() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0">
      <path
        d="M3 4.75 6 8l3-3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 트리거 라벨 — 현재 값 하나만 CSS 로 드러난다. */
function CurrentLabel<T extends string>({ options }: { options: readonly Option<T>[] }) {
  const { t } = useT();

  return (
    <span>
      {options.map(option => (
        <span key={option.value} className={option.show}>
          {t(option.key)}
        </span>
      ))}
    </span>
  );
}

function OptionList<T extends string>({
  options,
  value,
  onChange,
  palette,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 지금 팔레트. 어느 칸이 잠기는지는 옵션이 lockedIn 으로 안다. */
  palette?: Palette;
}) {
  const { t } = useT();

  return (
    <>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          aria-disabled={palette && option.lockedIn?.includes(palette) ? true : undefined}
          // pointer-events-none 이 포인터는 막지만 키보드는 여기서 막는다.
          onClick={() => {
            if (palette && option.lockedIn?.includes(palette)) return;
            onChange(option.value);
          }}
          className={cn(
            'text-meta text-ink hover:bg-surface-subtle block w-full rounded-md px-2 py-1.5 text-left',
            'focus-visible:outline-focus focus-visible:outline-2 focus-visible:-outline-offset-2',
            option.active,
            // 잠금은 CSS 가 건다. disabled 속성은 JS 를 기다려야 하고, 그러면
            // 하이드레이션 전 한 프레임 동안 못 고르는 칸이 멀쩡해 보인다.
            option.lock
          )}
        >
          {t(option.key)}
        </button>
      ))}
    </>
  );
}

/** 섹션 제목 — 패널 안에서 언어 · 테마 · 색상을 가른다. */
function SectionLabel({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <p className={cn('text-meta-sm text-ink-muted px-2 pt-1 pb-0.5', !first && 'mt-1')}>
      {children}
    </p>
  );
}

function ThemeSection({ first = false }: { first?: boolean }) {
  const { t } = useT();
  const theme = useTheme();
  const palette = usePalette();

  return (
    <>
      <SectionLabel first={first}>{t('settings.theme')}</SectionLabel>
      <OptionList options={THEME_OPTIONS} value={theme} onChange={applyTheme} palette={palette} />
    </>
  );
}

function ColorSection() {
  const { t } = useT();
  const palette = usePalette();

  return (
    <>
      <SectionLabel>{t('settings.color')}</SectionLabel>
      <div
        className="flex flex-row items-center gap-3 px-2 py-1.5"
        role="group"
        aria-label={t('settings.color')}
      >
        {PALETTE_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={palette === option.value}
            onClick={() => applyPalette(option.value)}
            style={{ backgroundImage: option.swatch }}
            className={cn(
              'border-line-strong ring-focus ring-offset-surface size-6 rounded-full border ring-offset-2',
              'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2',
              option.active
            )}
          >
            <span className="sr-only">{t(option.key)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function useTheme() {
  return useSyncExternalStore(subscribePrefs, readTheme, () => SERVER_THEME);
}

/** 지금 언어 — 주소에서 온 값을 I18nProvider 가 들고 있다. */
function useLocale(): Locale {
  const { i18n } = useT();
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}

/**
 * 언어 바꾸기 — 보던 화면의 다른 언어판으로 옮긴다.
 *
 * 테마 · 팔레트와 달리 언어는 저장할 값이 아니다. proxy 가 `/dev` 를 한국어로,
 * `/en/dev` 를 영어로 가르므로 고르는 행위가 곧 이동이다.
 *
 * 지금 주소는 usePathname 이 아니라 주소창에서 직접 읽는다. 한국어 주소는 proxy 가
 * 안에서 `/ko/…` 로 rewrite 하는데, 그러면 서버가 렌더한 값(`/ko/dev`)과 주소창
 * (`/dev`)이 갈린다 — Next 문서가 usePathname 의 rewrite 주의사항으로 적어 둔 그
 * 갈림이다. 앞의 값을 잡으면 splitLocale 이 `/ko` 를 언어 접두사로 보지 않아
 * (한국어는 접두사가 없는 게 정식) `/en/ko/dev` 같은 주소가 나온다. 클릭 시점의
 * 주소창은 언제나 정식 주소다.
 *
 * 쿼리와 앵커도 들고 간다 — 검색 결과(`?q=…`)를 보다 언어를 바꾸면 검색어가 남는다.
 */
function useSwitchLocale() {
  const router = useRouter();

  return (locale: Locale) => {
    const { search, hash, pathname } = window.location;
    const { path } = splitLocale(pathname);
    router.push(`${localeHref(locale, path)}${search}${hash}`);
  };
}

function usePalette() {
  return useSyncExternalStore(subscribePrefs, readPalette, () => SERVER_PALETTE);
}

export function LangMenu() {
  const { t } = useT();
  const locale = useLocale();
  const switchLocale = useSwitchLocale();

  return (
    <Dropdown
      label={t('settings.languageMenu')}
      trigger={
        <>
          <CurrentLabel options={LANG_OPTIONS} />
          <Caret />
        </>
      }
    >
      <OptionList options={LANG_OPTIONS} value={locale} onChange={switchLocale} />
    </Dropdown>
  );
}

/** 데스크톱 — 테마 · 색상. 언어는 옆 칸에 따로 선다. */
export function SettingsMenu() {
  const { t } = useT();

  return (
    <Dropdown
      label={t('settings.menu')}
      trigger={
        <>
          <span>{t('settings.menu')}</span>
          <Caret />
        </>
      }
    >
      <ThemeSection first />
      <ColorSection />
    </Dropdown>
  );
}

/** 모바일 — 언어 · 테마 · 색상을 한 패널에 담는다. */
export function MobileSettingsMenu() {
  const { t } = useT();
  const locale = useLocale();
  const switchLocale = useSwitchLocale();

  return (
    <Dropdown
      label={t('settings.menu')}
      trigger={
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
          <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 2.2v2M10 15.8v2M17.8 10h-2M4.2 10h-2M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4M15.5 15.5l-1.4-1.4M5.9 5.9 4.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      {SHOW_LANG_SWITCH && (
        <>
          <SectionLabel first>{t('settings.language')}</SectionLabel>
          <OptionList options={LANG_OPTIONS} value={locale} onChange={switchLocale} />
        </>
      )}

      {/* 언어 칸이 빠지면 테마가 패널의 첫 섹션이 된다 — 위 여백을 그때만 뗀다. */}
      <ThemeSection first={!SHOW_LANG_SWITCH} />
      <ColorSection />
    </Dropdown>
  );
}
