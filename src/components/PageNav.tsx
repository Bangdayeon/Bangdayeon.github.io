import { cn } from '@/lib/cn';

import { LocaleLink as Link } from '@/components/LocaleLink';

/** 한 쪽에 몇 편. 20편이면 스크롤 두어 번이라 아직 넘길 이유가 없다. */
export const PAGE_SIZE = 20;

export function pageCount(total: number) {
  return Math.max(Math.ceil(total / PAGE_SIZE), 1);
}

/**
 * 쪽 넘김. 1쪽은 /{base}, 2쪽부터는 /{base}/page/{n} 이다.
 *
 * 한 쪽에 다 들어가면 아무것도 그리지 않는다 — 글 세 편짜리 카테고리 밑에
 * "1 / 1" 이 붙어 있을 이유가 없다.
 */
export function PageNav({
  base,
  current,
  total,
}: {
  base: string;
  current: number;
  total: number;
}) {
  if (total <= 1) return null;

  const href = (page: number) => (page === 1 ? base : `${base}/page/${page}`);
  const linkClass =
    'text-meta text-ink hover:bg-surface-subtle focus-visible:outline-focus rounded-lg border border-line px-3 py-1.5 focus-visible:outline-2';

  return (
    <nav aria-label="쪽 넘김" className="mt-10 flex items-center justify-between gap-2">
      {current > 1 ? (
        <Link href={href(current - 1)} className={linkClass} rel="prev">
          이전
        </Link>
      ) : (
        <span />
      )}

      <span className="text-meta text-ink-muted">
        {current} / {total}
      </span>

      {current < total ? (
        <Link href={href(current + 1)} className={linkClass} rel="next">
          다음
        </Link>
      ) : (
        <span className={cn(linkClass, 'invisible')} aria-hidden="true">
          다음
        </span>
      )}
    </nav>
  );
}
