'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { addRecentSearch } from '@/lib/recent-searches';
import { getQuery, getServerQuery, setQuery, subscribeQuery } from '@/lib/search-query';

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-4', className)}>
      <circle cx="9" cy="9" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m13 13 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 헤더 검색바. 어느 페이지에서나 늘 펴져 있다.
 *
 * 입력창에 포커스가 닿는 순간 /search 로 넘어간다 — 최근 검색 · 태그 · 글
 * 그래프가 거기 있고, 그게 아직 아무것도 안 친 사람에게 보여줄 것의 전부다.
 * 클릭이든 탭 이동이든 같은 자리로 온다.
 *
 * 이 컴포넌트는 라우트가 바뀌어도 다시 마운트되지 않는다. 한글 조합 중에
 * 입력창이 새로 그려지면 조합이 깨지기 때문이다.
 */
export function SearchLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const onSearchPage = pathname === '/search';
  // 라우팅이 붙기 전에 여러 글자를 치면 push 가 여러 번 나가 히스토리가 쌓인다.
  const pushed = useRef(false);

  const goToSearch = () => {
    if (onSearchPage || pushed.current) return;
    pushed.current = true;
    router.push('/search');
  };

  // 값은 스토어가 들고 있다 — 화면 쪽 태그 칩이 눌려도 이 입력창이 같이 바뀐다.
  const value = useSyncExternalStore(subscribeQuery, getQuery, getServerQuery);

  // 공유받은 링크(/search?q=...)로 들어왔을 때 바로 이어 칠 수 있게.
  useEffect(() => {
    if (onSearchPage) inputRef.current?.focus();
  }, [onSearchPage]);

  // /search 를 떠나면 검색어를 비운다. 다음에 칠 때 빈 화면부터 시작한다.
  useEffect(() => {
    if (!onSearchPage) return;
    return () => {
      setQuery('');
      pushed.current = false;
    };
  }, [onSearchPage]);

  // URL 은 거울이다. replace 라서 타이핑이 히스토리를 오염시키지 않는다.
  useEffect(() => {
    if (!onSearchPage) return;

    const id = setTimeout(() => {
      const query = value.trim();
      router.replace(query ? `/search?q=${encodeURIComponent(query)}` : '/search', {
        scroll: false,
      });
    }, 200);

    return () => clearTimeout(id);
  }, [value, onSearchPage, router]);

  return (
    <form
      role="search"
      onSubmit={event => {
        event.preventDefault();
        // 최근 검색은 여기서만 쌓는다 — 타이핑 중간값이 들어가면 목록이 쓰레기가 된다.
        addRecentSearch(value);
        goToSearch();
      }}
      className={cn(
        'border-line bg-surface-subtle flex w-full min-w-0 items-center gap-2 rounded-full border px-3 py-1.5',
        'focus-within:border-primary'
      )}
    >
      <SearchIcon className="text-ink-muted shrink-0" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        // 포커스로도, 클릭으로도 온다. 뒤로가기로 돌아왔을 때는 입력창이 포커스를
        // 그대로 쥐고 있어 focus 이벤트가 다시 안 뜨는데, 그때는 클릭이 받아 준다.
        onFocus={goToSearch}
        onClick={goToSearch}
        onChange={event => {
          setQuery(event.target.value);
          // 포커스 없이 값이 들어오는 경우(자동완성 등)까지 받아 둔다.
          goToSearch();
        }}
        placeholder="글 검색"
        aria-label="글 검색"
        className="text-meta text-ink placeholder:text-ink-subtle w-full min-w-0 bg-transparent outline-none"
      />

      {value !== '' && (
        // 브라우저 기본 X 는 globals.css 에서 지웠다 (모양이 제각각이라).
        <button
          type="button"
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          aria-label="검색어 지우기"
          className={cn(
            'text-ink-muted hover:text-ink hover:bg-surface-muted grid size-5 shrink-0 place-items-center rounded-full',
            'focus-visible:outline-focus focus-visible:outline-2'
          )}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5">
            <path
              d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </form>
  );
}
