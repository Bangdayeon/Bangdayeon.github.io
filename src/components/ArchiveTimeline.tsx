import type { Post } from '@/types/post';

import { CATEGORY_COLOR, categoryPath } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { serverLocale, serverT } from '@/lib/t';

import { LocaleBadge } from '@/components/LocaleBadge';
import { LocaleLink as Link } from '@/components/LocaleLink';

/**
 * 아카이브 연표.
 *
 * 목록이 아니라 시간축으로 그린다 — 아카이브를 여는 사람이 궁금한 건 "무슨
 * 글이 있나"(그건 홈 · 카테고리 · 검색이 답한다)가 아니라 "언제 뭘 썼나"라서,
 * 연 · 월이 먼저 서고 글이 거기 매달리는 편이 읽힌다. 그래서 PostList 를
 * 쓰지 않고 따로 그린다 — 여기서는 날짜가 제목보다 앞에 온다.
 *
 * 세로선(척추)은 한 달 묶음마다 이어지고 글마다 카테고리 색 점이 그 위에
 * 찍힌다. 점 옆에는 카테고리 이름이 항상 글자로 함께 있다 (colors.css 원칙 3:
 * 색은 의미를 혼자 짊어지지 않는다).
 *
 * 연도 머리에는 해와 편수만 둔다. 월별 띠가 여기 있었는데, 페이지 머리의
 * 잔디밭(ArchiveHeatmap)이 같은 것을 하루 단위로 보여주게 되면서 지웠다 —
 * 눈금만 다른 같은 그림을 한 화면에 둘 놓을 이유가 없다.
 */
export async function ArchiveTimeline({ years }: { years: { year: string; posts: Post[] }[] }) {
  const { t } = await serverT();

  return (
    <div>
      {years.map(({ year, posts }) => (
        <section key={year} id={yearId(year)} className="mb-8 scroll-mt-20 last:mb-0">
          <YearHead year={year} posts={posts} />

          {groupByMonth(posts).map(({ month, posts: monthPosts }) => (
            <div key={month} className="flex gap-3 md:gap-5">
              {/* 월 라벨은 첫 글의 날짜 줄과 눈높이를 맞춘다 (pt-3 = 글 줄의 py-3). */}
              <p className="w-9 shrink-0 pt-3 text-right md:w-12">
                <span className="text-meta text-ink-subtle tabular-nums">
                  {t(`months.${Number(month)}`)}
                </span>
              </p>

              <ul className="border-line-subtle min-w-0 flex-1 border-l">
                {monthPosts.map((post, index) => (
                  <Row
                    key={post.id}
                    post={post}
                    // 날짜 닻은 그 날의 첫 줄에만 건다 — 하루에 글이 둘이면
                    // 같은 id 가 둘이 된다. 잔디밭의 칸이 이 닻으로 온다.
                    anchor={index === 0 || monthPosts[index - 1].date !== post.date}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** 연도 머리. 헤더(h-14) 아래에 붙어 따라 내려온다 — 스크롤 중에 지금 보는 해를 잃지 않게. */
async function YearHead({ year, posts }: { year: string; posts: Post[] }) {
  const { t } = await serverT();

  return (
    <div className="bg-surface sticky top-14 z-10">
      <div className="border-line flex items-center gap-3 border-b py-3">
        <h2 className="text-title-lg text-ink-strong tabular-nums">{year}</h2>
        <span className="text-meta text-ink-muted">
          {t('archive.count', { count: posts.length })}
        </span>
      </div>
    </div>
  );
}

async function Row({ post, anchor }: { post: Post; anchor: boolean }) {
  const { t } = await serverT();
  const locale = await serverLocale();
  const color = CATEGORY_COLOR[post.category];

  return (
    <li
      id={anchor ? dayId(post.date) : undefined}
      // 헤더(h-14)와 그 아래 붙는 연도 머리가 덮지 않을 만큼 띄운다.
      className="relative scroll-mt-28"
    >
      <Link
        href={`/${post.id}`}
        className="group hover:bg-surface-subtle focus-visible:outline-focus block rounded-r-lg py-3 pr-3 pl-5 focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        {/* 척추 위에 얹히는 점. ring 이 선을 끊어 점이 선 위에 떠 보인다. */}
        <span
          aria-hidden="true"
          className={cn(
            'ring-surface absolute top-[1.35rem] left-0 size-2.5 -translate-x-1/2 rounded-full ring-4 transition-transform group-hover:scale-125',
            color.dot
          )}
        />

        <span className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <time dateTime={post.date} className="text-meta text-ink-muted tabular-nums">
            {post.date.slice(5).replace('-', '.')}
          </time>
          <span className={cn('text-meta-sm', color.ink)}>
            {categoryPath(locale, post.category, post.subs)}
          </span>
          <LocaleBadge locale={post.locale} />
          {/* draft 는 dev 에서만 목록에 들어온다 — 프로덕션 산출물엔 없다. */}
          {post.draft && (
            <span className="text-meta-sm text-warning-ink bg-warning-subtle rounded px-1.5 py-0.5">
              {t('post.draft')}
            </span>
          )}
        </span>

        <span className="text-title-sm text-ink-strong group-hover:text-primary-ink block transition-colors">
          {post.title}
        </span>
        <span className="text-body-sm text-ink-muted mt-0.5 block truncate">{post.summary}</span>

        {/* 태그는 넓은 화면에서만. 좁은 화면에서는 한 해가 한눈에 들어오는 게 낫다. */}
        <span className="mt-2 hidden flex-wrap gap-1.5 md:flex">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="text-meta-sm text-ink bg-surface-muted rounded px-1.5 py-0.5"
            >
              {tag}
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}

function monthOf(post: Post) {
  return post.date.slice(5, 7);
}

/** 한 해의 글을 월별로. 들어온 순서(최신순)를 그대로 유지한다. */
function groupByMonth(posts: Post[]): { month: string; posts: Post[] }[] {
  const byMonth = new Map<string, Post[]>();

  for (const post of posts) {
    const month = monthOf(post);
    byMonth.set(month, [...(byMonth.get(month) ?? []), post]);
  }

  return [...byMonth]
    .map(([month, monthPosts]) => ({ month, posts: monthPosts }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** 연도 바로가기가 가리키는 id. 페이지 머리의 연도 칩과 짝이다. */
export function yearId(year: string) {
  return `year-${year}`;
}

/**
 * 하루가 시작하는 줄의 id. 페이지 머리의 잔디밭 칸(ArchiveHeatmap)과 짝이다.
 *
 * 글이 있는 날에만 이 닻이 선다 — 없는 날의 칸은 링크가 아니다.
 */
export function dayId(date: string) {
  return `day-${date}`;
}
