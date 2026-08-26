/**
 * 목록 화면의 제목 줄. 홈 · 카테고리 · 태그가 같은 걸 쓴다.
 *
 * 글 수는 제목 아래 따로 한 줄을 차지하지 않고 제목 옆에 붙는다 — 한 낱말짜리
 * 곁다리 정보라 줄을 하나 얻을 만큼 무겁지 않고, 아래로 깔면 제목과 본문
 * 사이가 두 번 끊긴다. items-baseline 이라 크기가 달라도 같은 선에 앉는다.
 *
 * h1 안에 넣지 않는 이유: 제목은 'dev' 이지 'dev 6편 · 2/3 쪽' 이 아니다.
 * 스크린리더의 제목 순회와 문서 개요에 쪽 번호가 섞이지 않게 밖에 둔다.
 */
export function PageTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <h1 className="text-title-lg text-ink-strong">{title}</h1>
      {meta !== undefined && <p className="text-meta text-ink-muted">{meta}</p>}
    </div>
  );
}
