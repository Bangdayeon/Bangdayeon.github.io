import type { Metadata } from 'next';

import type { Post } from '@/types/post';

import type { Category } from '@/lib/categories';
import { CATEGORIES, CATEGORY_COLOR, categoryLabel } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { getArchive } from '@/lib/posts';
import { serverLocale, serverT } from '@/lib/t';

import { ArchiveHeatmap } from '@/components/ArchiveHeatmap';
import { ArchiveTimeline, yearId } from '@/components/ArchiveTimeline';
import { LocaleLink as Link } from '@/components/LocaleLink';

import type { Locale } from '@/i18n.config';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverT();
  return { title: t('archive.title') };
}

/**
 * 전체 글을 시간축으로.
 *
 * 머리에 그 해 · 그 카테고리가 얼마나 쌓였는지를 먼저 보여주고(요약 띠),
 * 그 아래를 연표가 받는다. 아카이브는 "쌓인 양"이 곧 내용이라 목록만
 * 늘어놓으면 그게 안 보인다.
 */
export default async function ArchivePage() {
  const { t } = await serverT();
  const locale = await serverLocale();

  const years = getArchive(locale);
  const posts = years.flatMap(year => year.posts);

  if (posts.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[820px] px-6 py-10">
        <h1 className="text-display text-ink-strong mb-1">{t('archive.title')}</h1>
        <p className="text-body text-ink-muted py-16 text-center">{t('archive.empty')}</p>
      </main>
    );
  }

  // 글은 최신순으로 들어온다 — 배열의 끝이 첫 글, 앞이 마지막 글이다.
  const from = yearMonth(posts[posts.length - 1]);
  const to = yearMonth(posts[0]);

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-10">
      <header className="mb-8">
        <h1 className="text-display text-ink-strong">{t('archive.title')}</h1>
        <p className="text-meta text-ink-muted mt-1 tabular-nums">
          {from === to ? from : `${from} – ${to}`} · {t('archive.total', { count: posts.length })}
        </p>

        <CategoryBar posts={posts} locale={locale} />

        {/* 카테고리 띠가 "무엇을" 썼는지라면 이쪽은 "언제"다. 최신 해가 위로
            간다 — getArchive 가 이미 그 순서로 준다. */}
        <div className="mt-6 space-y-6">
          {years.map(({ year, posts: yearPosts }) => (
            <ArchiveHeatmap key={year} year={year} posts={yearPosts} />
          ))}
        </div>

        {/* 해가 하나뿐이면 바로가기가 곧 현재 위치라 의미가 없다. */}
        {years.length > 1 && (
          <nav aria-label={t('archive.yearJump')} className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {years.map(({ year, posts: yearPosts }) => (
                <li key={year}>
                  <a
                    href={`#${yearId(year)}`}
                    className="text-meta text-ink hover:bg-surface-subtle hover:text-primary-ink border-line focus-visible:outline-focus inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 tabular-nums transition-colors focus-visible:outline-2"
                  >
                    {year}
                    <span className="text-meta-sm text-ink-muted">{yearPosts.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <ArchiveTimeline years={years} />
    </main>
  );
}

/**
 * 카테고리 구성 띠 + 범례.
 *
 * 띠는 비율만 보여주는 그림이라 aria-hidden 이고, 숫자는 바로 아래 범례가
 * 글자로 말한다. 범례 칩은 그 카테고리 목록으로 간다 — 아카이브에서 갈라져
 * 나갈 곳은 결국 카테고리다.
 *
 * 언어는 prop 으로 받는다. 여기서 serverLocale() 을 다시 부를 수도 있지만,
 * 한 화면 안에서 같은 값을 두 군데서 읽으면 나중에 한쪽만 고치기 쉽다.
 */
function CategoryBar({ posts, locale }: { posts: Post[]; locale: Locale }) {
  const counts = CATEGORIES.map(category => ({
    category,
    count: posts.filter(post => post.category === category).length,
  })).filter(entry => entry.count > 0);

  return (
    <div className="mt-5">
      <div
        aria-hidden="true"
        className="bg-surface-muted flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {counts.map(({ category, count }) => (
          <span
            key={category}
            style={{ width: `${(count / posts.length) * 100}%` }}
            className={cn('block h-full', CATEGORY_COLOR[category].dot)}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {counts.map(({ category, count }) => (
          <li key={category}>
            <CategoryChip category={category} count={count} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryChip({
  category,
  count,
  locale,
}: {
  category: Category;
  count: number;
  locale: Locale;
}) {
  return (
    <Link
      href={`/${category}`}
      className="text-meta text-ink-muted hover:text-ink focus-visible:outline-focus group flex items-center gap-1.5 rounded focus-visible:outline-2"
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 shrink-0 rounded-full transition-transform group-hover:scale-125',
          CATEGORY_COLOR[category].dot
        )}
      />
      {categoryLabel(locale, [category])}
      <span className="text-ink-subtle tabular-nums">{count}</span>
    </Link>
  );
}

/** 기간 표시용 YYYY.MM. */
function yearMonth(post: Post) {
  return post.date.slice(0, 7).replace('-', '.');
}
