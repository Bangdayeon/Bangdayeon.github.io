'use client';

import { useT } from 'next-i18next/client';

import { cn } from '@/lib/cn';

/**
 * 별점 — 리뷰 글에만 붙는다 (frontmatter 의 rating).
 *
 * 목록에서는 요약 아래, 글에서는 요약 옆에 같은 모양으로 선다. 별 다섯 개를
 * 두 겹으로 겹쳐 놓고 위 겹의 폭만 잘라 반 개를 만든다 — 반쪽 별을 따로
 * 그리는 것보다 값이 몇이든(3.5 든 3.7 이든) 그대로 맞는다.
 *
 * 클라이언트 조각인 이유는 <T> 와 같다. 목록은 화면에 따라 서버에서도
 * 클라이언트에서도 그려지는데, 별의 뜻을 읽어 주는 문구는 언어를 타기 때문이다.
 */

const MAX = 5;

/** 채운 겹과 빈 겹이 한 픽셀도 어긋나면 안 돼서 별은 여기서만 그린다. */
function Stars({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex', className)}>
      {Array.from({ length: MAX }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" className="size-3.5 shrink-0 fill-current">
          <path d="M10 1.5l2.6 5.4 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function Rating({ value, className }: { value: number; className?: string }) {
  const { t } = useT();

  const label = t('post.rating', { score: value, max: MAX });
  const filled = Math.min(Math.max(value, 0), MAX) / MAX;

  return (
    <span title={label} className={cn('relative inline-flex align-middle', className)}>
      <Stars className="text-line-strong" />

      {/* 노랑은 warning 과 같은 색이다. 뜻이 겹쳐서가 아니라 이 사이트에 노랑이
          한 갈래뿐이라 그렇다 — 별점 전용 색을 하나 더 세울 만큼 다른 자리가 아니다. */}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${filled * 100}%` }}
      >
        <Stars className="text-warning-ink" />
      </span>

      {/* 별 다섯 개가 스크린리더에 '별 별 별 별 별' 로 읽히지 않게, 모양은
          숨기고 뜻만 한 줄로 말한다 (LocaleBadge 와 같은 방식이다). */}
      <span className="sr-only">{label}</span>
    </span>
  );
}
