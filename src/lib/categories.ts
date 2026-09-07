import type { Locale } from '@/i18n.config';

export const CATEGORIES = ['dev', 'design', 'review', 'toon', 'travel', 'diary'] as const;

export type Category = (typeof CATEGORIES)[number];

// 폴더명과 다르게 부를 때만 작성 (언어별로 다르게 둠)
export const CATEGORY_LABEL: Record<Locale, Record<string, string>> = {
  ko: {
    dev: '개발',
    'dev/frontend/react': 'React',
    'dev/frontend/state': '상태 관리',
    design: '디자인',
    review: '리뷰',
    'review/movie': '영화',
    'review/book': '책',
    toon: '인스타툰',
    travel: '여행',
    diary: '일상',
  },
  en: {
    dev: 'Dev',
    'dev/frontend/react': 'React',
    'dev/frontend/state': 'State management',
    design: 'Design',
    review: 'Reviews',
    'review/movie': 'Movies',
    'review/book': 'Books',
    toon: 'Comics',
    travel: 'Travel',
    diary: 'Diary',
  },
};

export function categoryLabel(locale: Locale, segments: string[]): string {
  return CATEGORY_LABEL[locale][segments.join('/')] ?? segments[segments.length - 1];
}

// urlPath 는 segments.join('/') 로 만들고, 화면에 내보낼 때만 categoryPath 사용
export function categoryPath(locale: Locale, category: Category, subs: string[] = []): string {
  const segments = [category, ...subs];
  return segments
    .map((_, index) => categoryLabel(locale, segments.slice(0, index + 1)))
    .join(' / ');
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

// 카테고리별 색상
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
  diary: {
    dot: 'bg-cat-diary',
    ink: 'text-cat-diary-ink',
    subtle: 'bg-cat-diary-subtle',
    fill: 'fill-cat-diary',
  },
};

// 하위 카테고리 색상은 부모와 동일
export function categoryColor(segments: string[]) {
  const root = segments[0];
  return isCategory(root) ? CATEGORY_COLOR[root] : null;
}
