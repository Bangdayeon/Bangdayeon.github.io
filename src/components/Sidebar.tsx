'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { useT } from 'next-i18next/client';

import type { NavNode } from '@/config/nav';
import type { Profile } from '@/config/profile';

import { CATEGORY_COLOR, isCategory } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { stripLocale } from '@/lib/i18n';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { SidebarProfile } from '@/components/SidebarProfile';

/* 카테고리가 아닌 항목(홈 · 아카이브 · 태그와 그 아래 태그들)의 활성 도트 색. */
const DEFAULT_DOT = 'bg-primary';
function activeDot(href: string) {
  const root = href.split('/')[1] ?? '';
  return isCategory(root) ? CATEGORY_COLOR[root].dot : DEFAULT_DOT;
}

/** '/' 는 정확히 일치할 때만 활성. 나머지는 하위 경로까지 포함한다. */
function isMatch(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findActiveHref(nodes: NavNode[], pathname: string) {
  let active = '';
  const stack: NavNode[] = [...nodes];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    if (node.href.length > active.length && isMatch(pathname, node.href)) {
      active = node.href;
    }
    if (node.children) stack.push(...node.children);
  }

  return active;
}

function hasActiveDescendant(node: NavNode, activeHref: string): boolean {
  return (node.children ?? []).some(
    child => child.href === activeHref || hasActiveDescendant(child, activeHref)
  );
}

function NavBranch({
  node,
  depth,
  activeHref,
}: {
  node: NavNode;
  depth: number;
  activeHref: string;
}) {
  const { t } = useT();
  const children = node.children ?? [];
  const listId = useId();

  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? (hasActiveDescendant(node, activeHref) || node.defaultOpen === true);

  const isActive = node.href === activeHref;

  const toggle = children.length > 0 ? () => setToggled(!open) : undefined;

  return (
    <li>
      <div
        onClick={toggle}
        className="hover:bg-surface-subtle relative flex cursor-pointer items-center pr-9"
        style={{ paddingInlineStart: `calc(1rem + ${depth} * 1rem)` }}
      >
        <Link
          href={node.href}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'text-nav flex min-w-0 items-center gap-1.5 py-2',
            'after:absolute after:inset-0',
            'focus-visible:outline-focus focus-visible:outline-2 focus-visible:-outline-offset-2',
            isActive
              ? 'text-ink-strong font-semibold'
              : node.muted
                ? 'text-ink-muted hover:text-ink'
                : 'text-ink'
          )}
        >
          <span className="truncate">{node.label}</span>

          {node.count !== undefined && (
            <span className="text-meta-sm text-ink-muted shrink-0 tabular-nums">
              ({node.count})
            </span>
          )}
        </Link>

        {children.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t('nav.submenu', {
              name: node.label,
              action: open ? t('nav.collapse') : t('nav.expand'),
            })}
            className="text-ink-muted hover:text-ink focus-visible:outline-focus relative z-10 grid size-5 shrink-0 place-items-center focus-visible:outline-2"
          >
            <svg
              viewBox="0 0 12 12"
              aria-hidden="true"
              className={cn('size-3 transition-transform duration-200', open && 'rotate-90')}
            >
              <path
                d="M4.5 2.5 8 6l-3.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {isActive && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
          >
            <span
              className={cn(
                'animate-pudding-rise block size-3 origin-bottom',
                activeDot(node.href)
              )}
            />
          </span>
        )}
      </div>

      {children.length > 0 && (
        <ul id={listId} hidden={!open}>
          {children.map(child => (
            <NavBranch key={child.href} node={child} depth={depth + 1} activeHref={activeHref} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({
  id,
  open,
  drawerOpen,
  onNavigate,
  nav,
  profile,
  views,
}: {
  id: string;
  /** md 이상 — 붙박이 칸을 폈는가. */
  open: boolean;
  /** md 미만 — 덮는 서랍을 열었는가. */
  drawerOpen: boolean;
  /** 서랍 안에서 링크를 눌렀다. 주소가 안 바뀌는 경우까지 닫으려고 있다. */
  onNavigate: () => void;
  nav: NavNode[];
  profile: Profile;
  views: number | null;
}) {
  const { t } = useT();
  // nav 의 href 는 접두사 없는 경로다 (링크에 접두사를 붙이는 건 LocaleLink 의
  // 몫이다). 주소를 그대로 대면 영어 화면에서 활성 항목이 하나도 안 잡힌다.
  const pathname = stripLocale(usePathname());
  const activeHref = findActiveHref(nav, pathname);

  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // 서랍은 열 때마다 맨 위에서 시작한다.
  //
  // 포커스를 주면 브라우저가 그 요소를 보이게 하려고 스스로 굴리는데, 메뉴가
  // 화면보다 길면 아래 끝이 잡혀서 열자마자 최하단이 나온다. 그래서 굴리지
  // 말라고 이르고(preventScroll) 스크롤 위치는 우리가 정한다.
  useEffect(() => {
    if (!drawerOpen) return;
    asideRef.current?.scrollTo({ top: 0 });
    navRef.current?.focus({ preventScroll: true });
  }, [drawerOpen]);
  const panel = cn(
    'w-full transition-opacity duration-150 md:w-56',
    // 서랍(md 미만)에서는 늘 보인다 — 접는 건 넓은 화면의 일이다. 그래서 아래
    // 두 갈래가 전부 md: 다. 접두사 없는 hidden 을 두면 좁은 화면에서 navOpen
    // 이 false 인 동안 서랍을 열어도 속이 비어 나온다.
    open ? 'md:visible md:opacity-100 md:delay-100' : 'md:invisible md:opacity-0 md:delay-0'
  );

  return (
    <aside
      ref={asideRef}
      className={cn(
        // ── md 이상: 지금까지의 붙박이 칸 ──
        'border-line bg-surface shrink-0 transition-[width] duration-150 ease-out',
        'md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)]',
        'md:overflow-x-hidden md:overflow-y-auto',
        'md:contain-[layout_paint]',
        'md:border-r',
        open ? 'md:w-56' : 'md:w-0 md:border-r-transparent',

        // ── md 미만: 헤더 아래를 덮는 서랍 ──
        // 닫혀 있으면 display:none 이라 접근성 트리에서도 빠진다 — aria-hidden
        // 을 따로 걸 필요가 없고, 화면 밖으로 밀어 둔 링크에 Tab 이 들어가는
        // 일도 없다. 서버가 보낸 HTML 부터 이미 닫혀 있어서 폭을 재는 한
        // 프레임도 없다.
        drawerOpen
          ? 'max-md:animate-drawer-in max-md:fixed max-md:top-14 max-md:bottom-0 max-md:left-0 max-md:z-40 max-md:w-56 max-md:max-w-[80%] max-md:overflow-y-auto max-md:overscroll-contain max-md:border-r max-md:shadow-lg'
          : 'max-md:hidden'
      )}
    >
      <div className={panel}>
        <SidebarProfile profile={profile} views={views} />
      </div>

      <nav
        ref={navRef}
        id={id}
        // AppShell 이 서랍을 열 때 여기로 포커스를 옮긴다. 프로그램이 준
        // 포커스는 :focus-visible 이 아니라서 테두리가 그려지지 않는다.
        tabIndex={-1}
        aria-label={t('nav.siteMenu')}
        // 서랍은 주소가 바뀌면 닫힌다(AppShell). 지금 서 있는 화면의 링크를
        // 누르면 주소가 안 바뀌어 그 길이 안 열리므로, 링크를 눌렀다는 사실
        // 자체로도 한 번 닫는다. 펼침 화살표나 여백은 그대로 둔다.
        onClick={event => {
          if (event.target instanceof Element && event.target.closest('a')) onNavigate();
        }}
        className={cn(panel, 'py-4')}
      >
        <ul>
          {nav.map(node => (
            <NavBranch key={node.href} node={node} depth={0} activeHref={activeHref} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
