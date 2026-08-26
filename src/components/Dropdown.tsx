'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';

/**
 * details 기반 드롭다운.
 *
 * UI 라이브러리를 쓰지 않으므로(README 규약) 열림 상태는 브라우저가 들게
 * 둔다 — details 는 키보드 조작과 스크린리더 안내를 이미 다 한다. JS 로
 * 보태는 건 두 가지, 바깥 클릭과 ESC 뿐이다. 상태를 React 로 끌어오지
 * 않아서 effect 안에서 setState 를 부르지 않는다.
 */
export function Dropdown({
  trigger,
  label,
  className,
  panelClassName,
  children,
}: {
  /** 버튼에 보이는 내용. */
  trigger: React.ReactNode;
  /** 스크린리더용 이름 (아이콘만 있는 트리거에 필요하다). */
  label: string;
  className?: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      const details = ref.current;
      if (details) details.open = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      const details = ref.current;
      if (!details?.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const details = ref.current;
      if (!details?.open) return;
      close();
      // 포커스를 트리거로 되돌린다 — 안 돌리면 키보드 사용자가 문서 처음으로 튄다.
      details.querySelector('summary')?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className={cn('relative', className)}>
      <summary
        aria-label={label}
        className={cn(
          'text-meta text-ink hover:bg-surface-subtle flex list-none items-center gap-1 rounded-lg px-2 py-1.5',
          'focus-visible:outline-focus focus-visible:outline-2',
          '[&::-webkit-details-marker]:hidden'
        )}
      >
        {trigger}
      </summary>

      <div
        // 옵션을 고르면 닫는다. 각 버튼에 핸들러를 다는 대신 여기서 한 번 받는다.
        onClick={() => {
          const details = ref.current;
          if (details) details.open = false;
        }}
        className={cn(
          'border-line bg-surface absolute top-full right-0 z-30 mt-1 min-w-36 rounded-lg border p-1 shadow-lg',
          panelClassName
        )}
      >
        {children}
      </div>
    </details>
  );
}
