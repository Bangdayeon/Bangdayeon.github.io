'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useT } from 'next-i18next/client';

import { CATEGORY_COLOR } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { type GraphLayout, nodeRadius } from '@/lib/graph-layout';

import { LocaleLink as Link } from '@/components/LocaleLink';

/**
 * 노드 하나의 흔들림. 가로세로의 주기가 서로 어긋나서 왕복이 아니라 떠도는
 * 궤적이 된다. 값은 인덱스에서만 나오므로 결정적이다 — 새로고침해도 같은
 * 자리에서 같은 모양으로 논다.
 *
 * 단위는 SVG 사용자 좌표(viewBox 720x520)라 화면에서는 축소돼 보인다.
 */
function floatOffset(index: number, time: number) {
  const ampX = 2 + ((index * 5) % 11);
  const ampY = 2 + ((index * 7) % 9);
  const speedX = 0.00034 + (index % 4) * 0.00006;
  const speedY = 0.00027 + (index % 3) * 0.00007;

  return {
    dx: Math.sin(time * speedX + index * 0.9) * ampX,
    dy: Math.cos(time * speedY + index * 1.3) * ampY,
  };
}

/**
 * 글 구조 그래프.
 *
 * 좌표는 서버에서 이미 계산해 온다 (lib/graph-layout.ts) — 여기서는 그리기와
 * 떠다니는 움직임만 맡는다. 노드는 그 자체가 링크라서 탭으로 순회할 수 있고,
 * 그래서 옆에 같은 목록을 또 두지 않는다.
 *
 * 선은 두 종류다. 실선은 소속(허브 → 하위 허브 → 글), 점선은 related(이어
 * 읽기). 굵기와 점선으로 갈라 두면 한 그림에서 헷갈리지 않는다.
 *
 * 폴더 트리가 그대로 뼈대라서, 하위 카테고리는 한 단 작은 허브로 나타난다.
 *
 * 부유를 CSS 애니메이션이 아니라 rAF 한 루프로 도는 이유: 선의 두 끝점은 서로
 * 다른 노드를 따라가야 하는데 한 요소에 transform 을 둘 걸 수는 없다. CSS 로
 * 하면 노드만 떠다니고 선은 제자리에 남아 서로 떨어져 나간다. 여기서는 매
 * 프레임 노드 오프셋을 구해 선 끝점까지 같이 옮긴다. React 상태를 거치지 않고
 * DOM 속성만 직접 쓰므로 리렌더는 일어나지 않는다.
 */
export function PostGraph({ layout }: { layout: GraphLayout }) {
  const { t } = useT();
  const [active, setActive] = useState<string | null>(null);

  const nodeEls = useRef(new Map<string, SVGGElement | null>());
  const lineEls = useRef<(SVGLineElement | null)[]>([]);
  /** 호버 · 포커스 중에는 시계를 멈춘다 — 읽고 누르려는 참이니까. */
  const paused = useRef(false);

  const indexById = useMemo(
    () => new Map(layout.nodes.map((node, index) => [node.id, index])),
    [layout.nodes]
  );

  // 강조 중인 노드와 직접 이어진 것들. 나머지는 흐려진다.
  const neighbors = useMemo(() => {
    if (!active) return null;

    const near = new Set<string>([active]);
    for (const link of layout.links) {
      if (link.source === active) near.add(link.target);
      if (link.target === active) near.add(link.source);
    }
    return near;
  }, [active, layout.links]);

  useEffect(() => {
    // 모션을 끈 사용자에게는 아예 돌리지 않는다. globals.css 의 전역 규칙은
    // CSS 애니메이션만 잡으므로 여기서는 직접 물어봐야 한다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let last = performance.now();
    let clock = 0;

    const step = (now: number) => {
      const delta = now - last;
      last = now;
      if (!paused.current) clock += delta;

      const offsets = layout.nodes.map((_, index) => floatOffset(index, clock));

      layout.nodes.forEach((node, index) => {
        const { dx, dy } = offsets[index];
        nodeEls.current
          .get(node.id)
          ?.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
      });

      layout.links.forEach((link, index) => {
        const element = lineEls.current[index];
        if (!element) return;

        const from = offsets[indexById.get(link.source) ?? 0];
        const to = offsets[indexById.get(link.target) ?? 0];

        element.setAttribute('x1', (link.x1 + from.dx).toFixed(2));
        element.setAttribute('y1', (link.y1 + from.dy).toFixed(2));
        element.setAttribute('x2', (link.x2 + to.dx).toFixed(2));
        element.setAttribute('y2', (link.y2 + to.dy).toFixed(2));
      });

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [layout, indexById]);

  if (layout.nodes.length === 0) {
    return (
      <p className="text-body text-ink-muted grid h-full place-items-center">{t('post.empty')}</p>
    );
  }

  const hover = (id: string | null) => {
    paused.current = id !== null;
    setActive(id);
  };

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-label={t('search.graphLabel')}
      // SVG 안의 글자와 원은 viewBox 대비 그려진 폭만큼 확대된다. 폭을 풀어
      // 두면 1100px 컬럼에서 1.5 배로 커져서 11px 라벨이 17px 로 보인다.
      // 자기 좌표계 크기(720)를 넘지 않게 막아 토큰 값이 곧 화면 크기가 되게 한다.
      style={{ maxWidth: layout.width }}
      className="mx-auto h-full w-full"
    >
      {layout.links.map((link, index) => {
        const dim =
          neighbors !== null && !(neighbors.has(link.source) && neighbors.has(link.target));
        const isCategory = link.kind === 'category';

        return (
          <line
            key={`${link.kind}|${link.source}|${link.target}`}
            ref={element => {
              lineEls.current[index] = element;
            }}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
            strokeWidth={isCategory ? 1.4 : 1}
            strokeDasharray={isCategory ? undefined : '3 4'}
            className={cn(
              'transition-opacity duration-200',
              isCategory ? 'stroke-line-strong' : 'stroke-line',
              dim && 'opacity-15'
            )}
          />
        );
      })}

      {layout.nodes.map(node => {
        const radius = nodeRadius(node);
        const dim = neighbors !== null && !neighbors.has(node.id);
        const isHub = node.kind === 'category';

        return (
          <g
            key={node.id}
            ref={element => {
              nodeEls.current.set(node.id, element);
            }}
          >
            <Link
              href={node.href}
              aria-label={node.label}
              onMouseEnter={() => hover(node.id)}
              onMouseLeave={() => hover(null)}
              onFocus={() => hover(node.id)}
              onBlur={() => hover(null)}
              className="group outline-none"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                className={cn(
                  'transition-opacity duration-200',
                  CATEGORY_COLOR[node.category].fill,
                  dim && 'opacity-25'
                )}
              />
              {/* 포커스 링은 SVG 라서 outline 대신 원을 하나 더 그린다. */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + 4}
                fill="none"
                strokeWidth={2}
                className="stroke-primary opacity-0 group-focus-visible:opacity-100"
              />
              {/* 허브 이름(dev · log · frontend…)은 짧아서 늘 띄워 둔다. 하위
                  카테고리는 한 톤 흐리게 — 이름이 늘어나도 맨 위 여섯 개가
                  먼저 읽히고, 나머지는 그 아래 갈래로 보인다.
                  글 제목은 겹쳐서 못 읽게 되므로 가리킬 때만 나온다. */}
              <text
                x={node.x}
                y={node.y - radius - (isHub ? 8 : 9)}
                textAnchor="middle"
                strokeWidth={4}
                style={{ paintOrder: 'stroke' }}
                className={cn(
                  'stroke-surface pointer-events-none transition-opacity duration-200',
                  !isHub &&
                    'text-meta-sm fill-ink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                  isHub &&
                    (node.depth <= 1
                      ? 'text-meta-xs fill-ink-strong'
                      : 'text-meta-xs fill-ink-muted'),
                  isHub && dim && 'opacity-30'
                )}
              >
                {node.label}
              </text>
            </Link>
          </g>
        );
      })}
    </svg>
  );
}
