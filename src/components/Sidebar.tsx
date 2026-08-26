'use client';

import { useId, useState } from 'react';

import { usePathname } from 'next/navigation';

import type { NavNode } from '@/config/nav';
import type { Profile } from '@/config/profile';

import { CATEGORY_COLOR, isCategory } from '@/lib/categories';
import { cn } from '@/lib/cn';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { SidebarProfile } from '@/components/SidebarProfile';

/* 카테고리가 아닌 고정 항목(홈 · 태그 · 아카이브 · 소개)의 활성 도트 색. */
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
            aria-label={`${node.label} 하위 메뉴 ${open ? '접기' : '펼치기'}`}
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
  nav,
  profile,
  views,
}: {
  id: string;
  open: boolean;
  nav: NavNode[];
  profile: Profile;
  views: number | null;
}) {
  const pathname = usePathname();
  const activeHref = findActiveHref(nav, pathname);
  const panel = cn(
    'w-full transition-opacity duration-150 md:w-56',
    open
      ? 'md:visible md:opacity-100 md:delay-100'
      : 'hidden md:invisible md:block md:opacity-0 md:delay-0'
  );

  return (
    <aside
      className={cn(
        'border-line bg-surface w-full shrink-0 transition-[width] duration-150 ease-out',
        'md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)]',
        'md:overflow-x-hidden md:overflow-y-auto',
        'md:[contain:layout_paint]',
        'md:border-r',
        open ? 'border-b md:w-56 md:border-b-0' : 'md:w-0 md:border-r-transparent'
      )}
    >
      <div className={panel}>
        <SidebarProfile profile={profile} views={views} />
      </div>

      <nav id={id} aria-label="사이트 메뉴" className={cn(panel, 'py-4')}>
        <ul>
          {nav.map(node => (
            <NavBranch key={node.href} node={node} depth={0} activeHref={activeHref} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
