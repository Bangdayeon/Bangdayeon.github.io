import { cn } from '@/lib/cn';

/**
 * 뼈대 한 조각.
 *
 * 색은 surface-muted 하나로 끝낸다 — 뼈대는 "여기에 뭔가 온다"만 말하면
 * 되고, 명암을 더 주면 로딩 화면이 실제 내용보다 눈에 띄는 역전이 생긴다.
 *
 * 깜빡임(animate-pulse)은 globals.css 의 prefers-reduced-motion 규칙이
 * 자동으로 잘라 낸다. 모션을 끈 사용자에게는 멈춘 회색 블록으로 보인다.
 *
 * aria-hidden 인 이유: 뼈대는 글자가 아니라 자리다. 스크린리더에 읽힐 것은
 * 이걸 감싸는 쪽의 "불러오는 중" 한 줄뿐이다.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('bg-surface-muted block animate-pulse rounded', className)}
    />
  );
}

/** 목록 한 줄. PostList 의 한 항목과 같은 세 줄 구성이다 (메타 · 제목 · 요약). */
function SkeletonRow() {
  return (
    <div className="px-3 py-4">
      <span className="mb-1 flex items-center gap-2">
        <Skeleton className="size-2 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </span>

      <Skeleton className="h-[1.125rem] w-[70%]" />
      <Skeleton className="mt-1.5 h-3.5 w-[45%]" />
    </div>
  );
}

/**
 * 목록 뼈대.
 *
 * 다섯 줄이다. 화면을 채우기엔 모자란 수지만, 실제 글이 세 편뿐인 카테고리에서
 * 열 줄이 깔렸다가 세 줄로 줄어드는 쪽이 더 어색하다 — 뼈대는 실제보다 길지
 * 않은 편이 낫다.
 *
 * divide-line-subtle 은 PostList 와 같은 구분선이다. 뼈대가 걷힐 때 줄 위치가
 * 그대로 이어져 화면이 튀지 않는다.
 */
export function PostListSkeleton() {
  return (
    <div className="divide-line-subtle divide-y">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
