'use client';

import { useSyncExternalStore } from 'react';

import { Trans, useT } from 'next-i18next/client';

import type { Post } from '@/types/post';

import { cn } from '@/lib/cn';
import type { GraphLayout } from '@/lib/graph-layout';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  getServerRecentSearches,
  removeRecentSearch,
  subscribeRecentSearches,
} from '@/lib/recent-searches';
import { searchPosts } from '@/lib/search';
import { getQuery, getServerQuery, setQuery, subscribeQuery } from '@/lib/search-query';

import { PostGraph } from '@/components/PostGraph';
import { PostList } from '@/components/PostList';

/**
 * /search 의 본문. 상태는 딱 둘이다.
 *
 *   검색어 없음 → 최근 검색 + 태그 + 그래프
 *   검색어 있음 → 결과 목록만 (없으면 문구 하나)
 *
 * 입력창은 여기 없다 — 헤더의 바 하나가 유일한 입력구이고, 값은
 * lib/search-query.ts 스토어로 오간다.
 */
export function SearchScreen({
  posts,
  tags,
  graphWide,
  graphNarrow,
}: {
  posts: Post[];
  tags: { tag: string; count: number }[];
  /** 카테고리당 5개 — md 이상. */
  graphWide: GraphLayout;
  /** 카테고리당 3개 — 좁은 화면. */
  graphNarrow: GraphLayout;
}) {
  const { t } = useT();
  const query = useSyncExternalStore(subscribeQuery, getQuery, getServerQuery).trim();

  if (query !== '') return <Results posts={searchPosts(posts, query)} query={query} />;

  return (
    <div className="min-w-0 space-y-8">
      <RecentSearches />
      <Tags tags={tags} />

      {/* 둘 다 마크업에 있지만 display:none 인 쪽은 접근성 트리에서도 빠진다.
          그래서 링크가 중복으로 읽히지 않는다. */}
      <section
        aria-label={t('search.graphRegion')}
        className="border-line min-h-[60dvh] rounded-xl border md:h-full"
      >
        <div className="h-full md:hidden">
          <PostGraph layout={graphNarrow} />
        </div>
        <div className="hidden h-full md:block">
          <PostGraph layout={graphWide} />
        </div>
      </section>
    </div>
  );
}

function Results({ posts, query }: { posts: Post[]; query: string }) {
  const { t } = useT();

  if (posts.length === 0) {
    return (
      <p className="text-body text-ink-muted py-16 text-center">
        {/* 사람이 친 검색어만 진하게. 문구에 태그를 적을 수는 없으므로 <em> 자리를
            컴포넌트로 갈아 끼운다 — 따옴표 위치나 어순이 언어마다 달라도 문구 파일이
            혼자 정한다. */}
        <Trans
          i18nKey="search.noResult"
          values={{ query }}
          components={{ em: <span className="text-ink-strong" /> }}
        />
      </p>
    );
  }

  return (
    <section aria-label={t('search.resultRegion')}>
      <p className="text-meta text-ink-muted mb-4">
        {t('search.resultCount', { count: posts.length })}
      </p>
      {/* 결과를 실제로 열었을 때만 최근 검색에 남긴다. */}
      <PostList posts={posts} onSelect={() => addRecentSearch(query)} />
    </section>
  );
}

function RecentSearches() {
  const { t } = useT();
  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearches,
    getServerRecentSearches
  );

  if (recent.length === 0) return null;

  return (
    <section aria-label={t('search.recentRegion')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-label text-ink-strong">{t('search.recent')}</h2>
        <button
          type="button"
          onClick={clearRecentSearches}
          className="text-meta text-ink-muted hover:text-ink focus-visible:outline-focus rounded focus-visible:outline-2"
        >
          {t('search.clearAll')}
        </button>
      </div>

      <ul className="flex flex-wrap gap-2">
        {recent.map(item => (
          <li key={item} className="border-line flex items-center rounded-full border">
            <button
              type="button"
              onClick={() => setQuery(item)}
              className="text-meta text-ink hover:text-primary-ink focus-visible:outline-focus rounded-l-full py-1 pr-1 pl-3 focus-visible:outline-2"
            >
              {item}
            </button>
            <button
              type="button"
              onClick={() => removeRecentSearch(item)}
              aria-label={t('search.removeRecent', { item })}
              className="text-ink-muted hover:text-ink focus-visible:outline-focus grid size-6 shrink-0 place-items-center rounded-r-full focus-visible:outline-2"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5">
                <path
                  d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tags({ tags }: { tags: { tag: string; count: number }[] }) {
  const { t } = useT();

  if (tags.length === 0) return null;

  return (
    <section aria-label={t('search.tagRegion')}>
      {/* 누르면 이 화면에서 바로 걸러진다. 태그 전용 색인은 /tags 가 따로 맡는다. */}
      <h2 className="text-label text-ink-strong mb-3">{t('search.tags')}</h2>

      <ul className="flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <button
              type="button"
              onClick={() => setQuery(tag)}
              className={cn(
                'text-meta text-ink bg-surface-muted hover:bg-primary-subtle hover:text-primary-ink rounded-full px-2.5 py-1',
                'focus-visible:outline-focus focus-visible:outline-2'
              )}
            >
              {tag}
              <span className="text-ink-muted ml-1">{count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
