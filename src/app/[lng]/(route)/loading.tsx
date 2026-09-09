import { PostListSkeleton, Skeleton } from '@/components/Skeleton';

/**
 * 페이지가 준비되는 동안 이 자리를 지킨다.
 *
 * Next 가 이 파일을 (route) 그룹의 page 바깥에 <Suspense> 로 두른다. 그래서
 * 링크를 누르는 순간 주소와 화면이 먼저 바뀌고 — 헤더 · 사이드바는 layout
 * 쪽이라 그대로 살아 있다 — 본문 자리만 뼈대로 채워졌다가 내용이 도착하면
 * 바뀐다. 내용을 다 기다렸다가 한 번에 넘어가던 것과 다르다.
 *
 * 이 그룹의 모든 화면(홈 · 카테고리 · 글 · 태그 · 아카이브 · 검색)이 이
 * 하나를 쓴다. 화면마다 모양을 맞추지 않은 건 [category]/[...rest] 한 라우트가
 * 글과 목록을 같이 받기 때문이다 — 어느 쪽인지는 내용을 읽어 봐야 알고, 그건
 * 이 뼈대가 이미 늦은 시점이다. 제목 한 줄 + 여러 줄이라는 공통 골격만 잡는다.
 *
 * 실제로 이게 보이는 건 프리페치가 끝나기 전에 링크를 누른 경우다. 모든
 * 페이지가 빌드 때 구워지고 Next 가 화면에 들어온 링크를 미리 받아 두므로,
 * 빠른 회선에서는 대개 스치지도 않는다. 느린 회선 · 첫 방문 · 페이로드가 큰
 * 화면(검색은 글 색인과 그래프 좌표를 통째로 싣는다)에서 값을 한다.
 *
 * 바깥 상자는 page.tsx 들과 한 글자도 다르면 안 된다 — 다르면 뼈대에서 내용으로
 * 바뀌는 순간 글이 옆으로 튄다. 여백을 고칠 때 여기도 같이 고칠 것.
 */
export default function Loading() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-[820px] px-4 py-10 sm:px-6">
      {/* 뼈대는 aria-hidden 이라 스크린리더에는 이 한 줄만 남는다. */}
      <p role="status" className="sr-only">
        불러오는 중
      </p>

      {/* PageTitle 과 같은 줄 구성 — 제목 옆에 곁다리 메타가 붙는다. */}
      <div className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Skeleton className="h-[1.875rem] w-44" />
        <Skeleton className="h-3.5 w-20" />
      </div>

      <PostListSkeleton />
    </main>
  );
}
