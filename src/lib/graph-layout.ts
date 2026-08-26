import {
  type SimulationNodeDatum,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';

import type { Graph, GraphNode } from '@/types/post';

/**
 * 글 그래프의 좌표 계산.
 *
 * d3-force 는 배치에만 쓴다 (README 규약의 유일한 예외). 수렴시킨 뒤 멈추고,
 * 화면에서 둥둥 떠다니는 건 노드마다 위상을 달리한 CSS 애니메이션이 맡는다.
 * 매 프레임 tick 을 도는 것보다 배터리에도, prefers-reduced-motion 대응에도
 * 유리하다.
 *
 * 초기 좌표를 원형으로 직접 주기 때문에 결과가 결정적이다 — 새로고침해도
 * 같은 그림이 나오고, 서버에서 한 번 계산해 정적 HTML 에 실을 수 있다.
 */

export type PositionedNode = GraphNode & { x: number; y: number };

export type PositionedLink = {
  source: string;
  target: string;
  kind: 'category' | 'related';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type GraphLayout = {
  /** SVG viewBox 크기. 화면 폭에 맞추는 건 CSS 가 한다. */
  width: number;
  height: number;
  nodes: PositionedNode[];
  links: PositionedLink[];
};

type SimNode = GraphNode & SimulationNodeDatum;
type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  kind: 'category' | 'related';
};

/** forceLink 콜백에서 두 끝은 이미 노드로 풀려 있다 (초기화 때 문자열 → 객체). */
function isHub(end: string | SimNode) {
  return typeof end !== 'string' && end.kind === 'category';
}

const WIDTH = 720;
const HEIGHT = 520;
const PADDING = 56;

/**
 * 노드 반지름 — 카테고리 허브가 크고, 글은 related 가 많을수록 크다.
 *
 * 맨 위 허브는 보통 크기의 글보다 두 배쯤, 가장 큰 글보다 조금 큰 선에서
 * 멈춘다. 그보다 키우면 위계가 아니라 덩어리가 되고 주변 글이 그 그늘에 든다.
 *
 * 하위 카테고리 허브는 한 단 내려갈 때마다 작아지되 글보다는 크게 남는다 —
 * 폴더 길이 깊어져도 "허브인지 글인지"가 크기로 먼저 읽혀야 한다.
 */
export function nodeRadius(node: Pick<GraphNode, 'kind' | 'degree' | 'depth'>) {
  if (node.kind !== 'category') return 4.5 + Math.min(node.degree, 5) * 0.9;

  const base = 9 + Math.min(node.degree, 8) * 0.5;
  return round(base * Math.max(0.75 ** (node.depth - 1), 0.6));
}

export function layoutGraph(graph: Graph): GraphLayout {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  // 시작점을 원 위에 고르게 흩어 놓는다. d3 기본 배치(파일로택시)에 맡기지
  // 않는 이유는 하나다 — 여기서 좌표를 정해야 결과가 매번 같다.
  const nodes: SimNode[] = graph.nodes.map((node, index) => {
    const angle = (index / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
    return {
      ...node,
      x: cx + Math.cos(angle) * 180,
      y: cy + Math.sin(angle) * 140,
    };
  });

  const links: SimLink[] = graph.links.map(link => ({ ...link }));

  forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id(node => node.id)
        // 카테고리 선은 짧고 세게 당겨 글이 허브 주위에 뭉치게 하고,
        // related 선은 길고 느슨하게 둬서 뭉치들을 밀어내지 않게 한다.
        // 허브끼리 잇는 선만 조금 길다 — 부모 둘레에 자식 무리가 들어설 자리다.
        .distance(link =>
          link.kind === 'related' ? 130 : isHub(link.source) && isHub(link.target) ? 104 : 74
        )
        .strength(link => (link.kind === 'category' ? 0.9 : 0.18))
    )
    // 허브끼리는 세게 밀어내 6개 무리가 서로 겹치지 않게 한다. 하위 허브는
    // 그보다 약하게 — 부모에게서 떨어져 나가지 않으면서 형제끼리만 벌어진다.
    .force(
      'charge',
      forceManyBody<SimNode>().strength(node =>
        node.kind === 'category' ? -900 * 0.62 ** (node.depth - 1) : -230
      )
    )
    // 가운데로 모으는 힘을 x · y 로 나눠 세로를 조금 더 조인다. 하나로 묶으면
    // (forceCenter) 결과가 세로로 길쭉해져서 가로 720 짜리 상자에 여백만 남는다.
    .force('x', forceX<SimNode>(cx).strength(0.05))
    .force('y', forceY<SimNode>(cy).strength(0.08))
    .force(
      'collide',
      forceCollide<SimNode>().radius(node => nodeRadius(node) + 12)
    )
    .stop()
    .tick(320);

  const positioned = fit(nodes);
  const byId = new Map(positioned.map(node => [node.id, node]));

  const drawn: PositionedLink[] = [];
  for (const link of graph.links) {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) continue;
    drawn.push({
      source: link.source,
      target: link.target,
      kind: link.kind,
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
    });
  }

  return { width: WIDTH, height: HEIGHT, nodes: positioned, links: drawn };
}

/** 결과를 viewBox 안에 넣는다. 가로세로를 같은 비율로 줄여 모양을 지킨다. */
function fit(nodes: SimNode[]): PositionedNode[] {
  const xs = nodes.map(node => node.x ?? 0);
  const ys = nodes.map(node => node.y ?? 0);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const scale = Math.min(
    (WIDTH - PADDING * 2) / Math.max(maxX - minX, 1),
    (HEIGHT - PADDING * 2) / Math.max(maxY - minY, 1),
    1.6
  );

  // 줄인 뒤 남는 여백을 반씩 나눠 가운데로 민다.
  const offsetX = (WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (HEIGHT - (maxY - minY) * scale) / 2;

  return nodes.map(node => ({
    id: node.id,
    label: node.label,
    category: node.category,
    kind: node.kind,
    depth: node.depth,
    href: node.href,
    degree: node.degree,
    x: round(((node.x ?? 0) - minX) * scale + offsetX),
    y: round(((node.y ?? 0) - minY) * scale + offsetY),
  }));
}

/** 소수점 둘째 자리까지 — HTML 에 실리는 숫자라 짧을수록 좋다. */
function round(value: number) {
  return Math.round(value * 100) / 100;
}
