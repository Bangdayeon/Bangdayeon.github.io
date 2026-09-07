import { cn } from '@/lib/cn';
import { CALLOUT_TYPES, type CalloutType } from '@/lib/mdx/remark-callout';

import { T } from '@/components/T';

/**
 * Obsidian 콜아웃.
 *
 *   > [!tip] 제목
 *   > 본문
 *
 * remark-callout 이 blockquote 를 <callout> 으로 바꾸고, MDX 컴포넌트 맵이
 * 이 컴포넌트로 잇는다. 그래서 props 는 전부 문자열로 들어온다.
 *
 * 색은 이미 있는 시맨틱 토큰을 그대로 쓴다 — 콜아웃 전용 색을 새로 만들면
 * 팔레트가 두 벌이 된다.
 *
 * 테두리는 없다. 왼쪽 굵은 선 + 연한 바탕 + 색 글자까지 세 겹으로 같은 말을
 * 하고 있었고, 그중 선이 제일 시끄러웠다. 바탕색 면 하나로 영역을 표시하고
 * 종류는 머리줄의 아이콘과 색이 말한다.
 */

const STYLES: Record<CalloutType, { box: string; mark: string; icon: string }> = {
  note: {
    box: 'bg-primary-subtle',
    mark: 'text-primary-ink',
    // 느낌표 (알림)
    icon: 'M12 8v5m0 3.2v.1',
  },
  tip: {
    box: 'bg-success-subtle',
    mark: 'text-success-ink',
    // 체크
    icon: 'm8 12.5 2.8 2.8L16.5 9.6',
  },
  danger: {
    box: 'bg-error-subtle',
    mark: 'text-error-ink',
    // 엑스
    icon: 'm8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4',
  },
  quote: {
    // 유채색이 아니라 중성색이다. surface-subtle 은 본문 배경과 거의 같아
    // 면이 보이지 않으므로 한 단 더 짙은 muted 를 쓴다.
    box: 'bg-surface-muted',
    mark: 'text-ink-muted',
    // 따옴표
    icon: 'M9.5 9.5h-2v2h2v3M16.5 9.5h-2v2h2v3',
  },
};

/**
 * 머리줄 문구. 값이 아니라 키다 — 이 컴포넌트는 MDX 컴파일 결과 안에서
 * 그려지므로 await 를 걸 자리가 없다. 문구는 <T> 가 읽는다.
 */
const LABEL_KEYS: Record<CalloutType, string> = {
  note: 'callout.note',
  tip: 'callout.tip',
  danger: 'callout.danger',
  quote: 'callout.quote',
};

function isCalloutType(value: string): value is CalloutType {
  return (CALLOUT_TYPES as readonly string[]).includes(value);
}

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  const kind = isCalloutType(type) ? type : 'note';
  const style = STYLES[kind];

  return (
    <aside className={cn('my-6 rounded-lg px-4 py-3.5', style.box)}>
      <p className={cn('text-label mb-1.5 flex items-center gap-1.5', style.mark)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d={style.icon}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {title || <T k={LABEL_KEYS[kind]} />}
      </p>

      {/* 콜아웃 안에서는 블록 사이 간격을 본문보다 좁힌다 — 본문 여백(p my-5 ·
          pre my-6)을 그대로 두면 상자 안이 헐거워 보인다. 첫/마지막 요소의
          바깥 여백은 지워서 상자의 padding 만 남긴다. */}
      <div
        className={cn(
          'text-body-sm text-ink',
          // 본문 문단은 text-body-lg(18px) 를 스스로 달고 온다. 상자 안에서는
          // 한 단 낮춰야 바깥 본문과 구분되므로 자식 선택자로 다시 지정한다.
          '[&>p]:text-body-sm',
          '[&>blockquote]:my-2 [&>ol]:my-1 [&>p]:my-1 [&>pre]:my-2.5 [&>ul]:my-1',
          '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
        )}
      >
        {children}
      </div>
    </aside>
  );
}
