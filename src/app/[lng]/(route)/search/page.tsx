import type { Metadata } from 'next';

import { layoutGraph } from '@/lib/graph-layout';
import { getAllPosts, getGraph, getRecentTags } from '@/lib/posts';
import { serverLocale, serverT } from '@/lib/t';

import { SearchScreen } from '@/components/SearchScreen';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverT();
  return { title: t('search.title') };
}

/** 검색 화면에 세울 태그 수. 나머지는 /tags 가 맡는다. */
const SEARCH_TAGS = 10;

/**
 * 검색 화면.
 *
 * 그래프 좌표까지 여기서(빌드 타임에) 계산해 내려보낸다 — 결정적 배치라
 * 방문할 때마다 같은 그림이 나오고, 클라이언트는 그리기만 한다.
 *
 * 태그는 전부 세우지 않는다 — 요즘 뭘 쓰고 있나를 짚어 주는 자리라 최근에
 * 쓴 것부터 열 개만 둔다. 전부 보는 길은 /tags 다.
 *
 * 넓은 화면과 좁은 화면은 카테고리당 글 수가 달라서 배치를 각각 뽑는다.
 * 화면 폭을 JS 로 재서 하나만 그리면 모바일에서 데스크톱 그래프가 한 프레임
 * 비친다 — 둘 다 실어 보내고 CSS 가 고르게 한다.
 */
export default async function SearchPage() {
  const { t } = await serverT();
  const locale = await serverLocale();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="sr-only">{t('search.heading')}</h1>

      <SearchScreen
        posts={getAllPosts(locale)}
        tags={getRecentTags(locale, SEARCH_TAGS)}
        graphWide={layoutGraph(getGraph(locale, 5))}
        graphNarrow={layoutGraph(getGraph(locale, 3))}
      />
    </main>
  );
}
