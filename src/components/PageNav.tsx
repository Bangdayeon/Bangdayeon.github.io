import { cn } from '@/lib/cn';
import { serverT } from '@/lib/t';

import { LocaleLink as Link } from '@/components/LocaleLink';

/** 한 쪽에 몇 편. 20편이면 스크롤 두어 번이라 아직 넘길 이유가 없다. */
export const PAGE_SIZE = 20;

/** 번호를 다 펼쳐 두는 한계. 여기까지는 1 2 3 … 10 이 그대로 다 선다. */
const FULL_UP_TO = 10;

export function pageCount(total: number) {
  return Math.max(Math.ceil(total / PAGE_SIZE), 1);
}

/**
 * 무엇을 그릴지 — 쪽 번호와 생략 부호(`null`)가 섞인 한 줄.
 *
 * 10쪽까지는 전부 편다. 그 위로는 첫 쪽 · 마지막 쪽 · 지금 쪽과 그 앞뒤만
 * 남기고 사이를 접는다. 지금 쪽이 어디에 있든 최대 일곱 칸이라 쪽을 넘겨도
 * 줄 길이가 출렁이지 않는다.
 *
 * 접었을 때 한 쪽만 가려지는 자리에는 부호 대신 그 번호를 그대로 둔다 —
 * `1 … 3` 은 `1 2 3` 보다 길지도 짧지도 않으면서 누를 수만 없다.
 */
export function pageItems(current: number, total: number): (number | null)[] {
  if (total <= FULL_UP_TO) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const kept = [...new Set([1, current - 1, current, current + 1, total])]
    .filter(page => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const items: (number | null)[] = [];
  for (const page of kept) {
    const last = items[items.length - 1];
    if (typeof last === 'number') {
      if (page - last === 2) items.push(last + 1);
      else if (page - last > 2) items.push(null);
    }
    items.push(page);
  }
  return items;
}

/**
 * 쪽 넘김. 1쪽은 /{base}, 2쪽부터는 /{base}/page/{n} 이다.
 *
 * 한 쪽에 다 들어가면 아무것도 그리지 않는다 — 글 세 편짜리 카테고리 밑에
 * 번호 하나가 덩그러니 붙어 있을 이유가 없다.
 */
export async function PageNav({
  base,
  current,
  total,
}: {
  base: string;
  current: number;
  total: number;
}) {
  if (total <= 1) return null;

  const { t } = await serverT();

  const href = (page: number) => (page === 1 ? base : `${base}/page/${page}`);

  // 칸 크기를 화살표 · 번호 · 생략 부호가 모두 나눠 쓴다. 그래야 접힌 자리와
  // 펼친 자리의 높이와 리듬이 같다.
  const cell =
    'text-meta inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 tabular-nums';
  const clickable =
    'text-ink hover:bg-surface-subtle focus-visible:outline-focus focus-visible:outline-2';

  const arrow = (to: number, label: string, glyph: string, rel: 'prev' | 'next') => {
    // 끝에 닿으면 링크를 지우되 자리는 남긴다. 화살표가 사라지면서 번호 줄이
    // 통째로 옆으로 밀리는 게 눌러서 넘길 때 가장 거슬린다.
    if (to < 1 || to > total) {
      return (
        <span className={cn(cell, 'text-ink-subtle')} aria-hidden="true">
          {glyph}
        </span>
      );
    }
    return (
      <Link href={href(to)} rel={rel} aria-label={label} className={cn(cell, clickable)}>
        <span aria-hidden="true">{glyph}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={t('pagination.region')}
      className="mt-10 flex items-center justify-center gap-1"
    >
      {arrow(current - 1, t('pagination.prev'), '‹', 'prev')}

      {pageItems(current, total).map((page, index) =>
        page === null ? (
          // 생략 부호는 읽어 줄 것이 없다. 화면 낭독기에는 앞뒤 번호만 들린다.
          <span key={`gap-${index}`} className={cn(cell, 'text-ink-subtle')} aria-hidden="true">
            …
          </span>
        ) : page === current ? (
          <span
            key={page}
            aria-current="page"
            className={cn(cell, 'bg-primary-subtle text-primary-ink font-semibold')}
          >
            {/* 링크가 아니라 그냥 span 이라 aria-label 은 낭독기가 버린다.
                Rating · LocaleBadge 와 같은 방식으로 문구를 따로 둔다. */}
            <span className="sr-only">{t('pagination.page', { page })}</span>
            <span aria-hidden="true">{page}</span>
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            aria-label={t('pagination.page', { page })}
            className={cn(cell, clickable)}
          >
            {page}
          </Link>
        )
      )}

      {arrow(current + 1, t('pagination.next'), '›', 'next')}
    </nav>
  );
}
