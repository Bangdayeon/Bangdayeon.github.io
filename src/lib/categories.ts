/**
 * 카테고리 목록 (브리프 4장). 콘텐츠에서는 content/ 하위 폴더가 카테고리를 결정하고,
 * 라우트에서는 이 배열이 /{category} 의 정적 파라미터가 된다.
 */
export const CATEGORIES = ['dev', 'design', 'review', 'toon', 'travel', 'log'] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * 화면에 내보낼 이름. 폴더 이름과 다르게 쓰고 싶을 때만 적는다.
 *
 * 폴더 이름은 그대로 URL 이 되므로 소문자 영문 · 숫자 · 하이픈만 쓸 수 있다
 * (post-schema.ts 의 SUB). 그 제약은 주소에만 있는 것이지 화면에까지 있을
 * 이유가 없어서, 한글이나 대소문자를 섞어 부르고 싶으면 여기 한 줄 적는다.
 *
 * 키는 카테고리 폴더 길 전체다 — 이름이 겹치는 하위 카테고리가 서로 다른
 * 부모 아래에 생겨도 각자 다르게 부를 수 있다. 적지 않으면 폴더 이름을 그대로
 * 쓴다. 이름만 바꾸는 것이므로 주소는 그대로고, 이미 걸린 링크도 안 깨진다.
 */
export const CATEGORY_LABEL: Record<string, string> = {
  'dev/frontend/react': 'React',
  'dev/frontend/state': '상태 관리',
};

/** 한 마디의 이름 — categoryLabel(['dev', 'frontend']) → 'frontend'. */
export function categoryLabel(segments: string[]): string {
  return CATEGORY_LABEL[segments.join('/')] ?? segments[segments.length - 1];
}

/**
 * 글이 들어 있는 폴더 길 — 'dev' · 'dev / frontend / 상태 관리'.
 *
 * 목록 · 아카이브 · 상세가 같은 함수를 쓴다. 셋의 표기가 갈라지면 같은 글이
 * 화면마다 다른 카테고리에 있는 것처럼 보인다.
 *
 * 마디마다 CATEGORY_LABEL 을 찾으므로 중간 칸만 별명이 있어도 된다.
 */
export function categoryPath(category: Category, subs: string[] = []): string {
  const segments = [category, ...subs];
  return segments.map((_, index) => categoryLabel(segments.slice(0, index + 1))).join(' / ');
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * 카테고리별 색 클래스.
 *
 * Tailwind 는 소스에 문자열로 존재하는 클래스만 생성한다. `bg-cat-${category}`
 * 처럼 조립하면 유틸리티가 만들어지지 않으므로 전체 클래스명을 여기 적어둔다.
 *
 *   dot     목록의 카테고리 도트 · 상세 상단 띠 (면. 글자색 아님)
 *   ink     같은 계열 글자색 (AA 통과)
 *   subtle  칩 · 배너 배경
 *   fill    SVG 면 (/search 의 글 그래프 노드)
 *
 * 색은 의미를 혼자 짊어지지 않는다 — 도트 옆에는 항상 카테고리 이름이 텍스트로
 * 함께 있어야 한다. 좌측 네비 활성 도트도 이 dot 을 쓴다 (Sidebar 참고).
 * 하위 카테고리는 자기 색을 따로 갖지 않고 맨 위 칸의 색을 물려받으므로,
 * 여기 적을 것은 CATEGORIES 여섯 개뿐이다.
 */
export const CATEGORY_COLOR: Record<
  Category,
  { dot: string; ink: string; subtle: string; fill: string }
> = {
  dev: {
    dot: 'bg-cat-dev',
    ink: 'text-cat-dev-ink',
    subtle: 'bg-cat-dev-subtle',
    fill: 'fill-cat-dev',
  },
  design: {
    dot: 'bg-cat-design',
    ink: 'text-cat-design-ink',
    subtle: 'bg-cat-design-subtle',
    fill: 'fill-cat-design',
  },
  review: {
    dot: 'bg-cat-review',
    ink: 'text-cat-review-ink',
    subtle: 'bg-cat-review-subtle',
    fill: 'fill-cat-review',
  },
  toon: {
    dot: 'bg-cat-toon',
    ink: 'text-cat-toon-ink',
    subtle: 'bg-cat-toon-subtle',
    fill: 'fill-cat-toon',
  },
  travel: {
    dot: 'bg-cat-travel',
    ink: 'text-cat-travel-ink',
    subtle: 'bg-cat-travel-subtle',
    fill: 'fill-cat-travel',
  },
  log: {
    dot: 'bg-cat-log',
    ink: 'text-cat-log-ink',
    subtle: 'bg-cat-log-subtle',
    fill: 'fill-cat-log',
  },
};

/**
 * 폴더 길의 맨 위 칸이 정하는 색. 하위 카테고리는 자기 색을 따로 갖지 않는다.
 * 카테고리가 아니면 null — 부르는 쪽이 색 없이 그린다.
 */
export function categoryColor(segments: string[]) {
  const root = segments[0];
  return isCategory(root) ? CATEGORY_COLOR[root] : null;
}
