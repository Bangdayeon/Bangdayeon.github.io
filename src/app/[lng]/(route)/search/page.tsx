import type { Metadata } from 'next';

import { layoutGraph } from '@/lib/graph-layout';
import { getAllPosts, getGraph, getTagCounts } from '@/lib/posts';

import { SearchScreen } from '@/components/SearchScreen';

export const metadata: Metadata = {
  title: '검색',
};

/**
 * 검색 화면.
 *
 * 그래프 좌표까지 여기서(빌드 타임에) 계산해 내려보낸다 — 결정적 배치라
 * 방문할 때마다 같은 그림이 나오고, 클라이언트는 그리기만 한다.
 *
 * 넓은 화면과 좁은 화면은 카테고리당 글 수가 달라서 배치를 각각 뽑는다.
 * 화면 폭을 JS 로 재서 하나만 그리면 모바일에서 데스크톱 그래프가 한 프레임
 * 비친다 — 둘 다 실어 보내고 CSS 가 고르게 한다.
 */
export default function SearchPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-8">
      <h1 className="sr-only">글 검색</h1>

      <SearchScreen
        posts={getAllPosts()}
        tags={getTagCounts()}
        graphWide={layoutGraph(getGraph(5))}
        graphNarrow={layoutGraph(getGraph(3))}
      />
    </main>
  );
}
