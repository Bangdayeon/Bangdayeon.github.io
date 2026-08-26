import { z } from 'zod';

import { CATEGORIES, type Category, isCategory } from '@/lib/categories';

/**
 * frontmatter 검증.
 *
 * strictObject 라서 아래 다섯 개 말고 다른 키가 있으면 실패한다 — "필수
 * frontmatter 5개를 절대 늘리지 않는다"는 규약을 사람이 아니라 기계가 지킨다.
 * 이어 읽을 글(related)은 frontmatter 가 아니라 본문 [[위키링크]] 에서 나온다.
 */

/** 소문자 영문 · 숫자 · 한글, 사이는 하이픈. (README 규약) */
const TAG = /^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/;

/**
 * YAML 은 따옴표 없는 2026-08-11 을 Date 객체로 읽는다. 글 쓰는 사람에게
 * 따옴표를 강요하는 대신 여기서 도로 문자열로 만든다 — YAML 의 날짜는 UTC
 * 자정이라 toISOString 의 앞 열 글자가 곧 적힌 그대로의 날짜다.
 */
const dateString = z.preprocess(
  value => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 한다')
);

export const frontmatterSchema = z.strictObject({
  title: z.string().min(1, '제목이 비어 있다'),
  date: dateString,
  summary: z.string().min(1, '요약이 비어 있다').max(200, '요약은 200자를 넘기지 않는다'),
  tags: z
    .array(z.string().regex(TAG, '태그는 소문자 영문 · 숫자 · 한글과 하이픈만'))
    .min(2, '태그는 2개 이상')
    .max(5, '태그는 5개 이하')
    .refine(
      tags => !tags.some(tag => isCategory(tag)),
      `태그는 카테고리명과 겹칠 수 없다 (${CATEGORIES.join(' · ')})`
    ),
  draft: z.boolean(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/** 폴더와 파일명에서 뽑아낸 것들. 날짜는 frontmatter 가 정본이고 여기 건 참고용이다. */
export type FileMeta = {
  /** 맨 위 폴더. 색과 그래프 허브는 이 값만 본다. */
  category: Category;
  /** 카테고리와 파일 사이의 폴더들 — 하위 카테고리. 없으면 빈 배열. */
  subs: string[];
  /** 영문 소문자 + 하이픈. 파일명의 날짜는 뺀 부분. */
  slug: string;
  /** 파일명 앞의 날짜. frontmatter 와 다르면 경고한다. */
  date: string;
  /** `category/…subs/slug`. 그대로 URL 이 된다. */
  id: string;
};

const FILENAME = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;

/** 하위 카테고리 폴더 이름. slug 와 같은 규칙이다. */
const SUB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 폴더 이름으로 쓸 수 없는 말.
 *
 * `page` 는 쪽 넘김이 이미 쓰고 있다 (/dev/page/2). 하위 카테고리로 허용하면
 * /dev/page 가 목록인지 2쪽인지를 경로만 보고는 가릴 수 없게 된다.
 */
const RESERVED = new Set(['page']);

/**
 * `dev/2026-08-11-next-16.mdx`        → { category: 'dev', subs: [], slug: 'next-16' }
 * `dev/nextjs/2026-08-11-next-16.mdx` → { category: 'dev', subs: ['nextjs'], … }
 *
 * 카테고리 폴더 아래로는 몇 단이든 팔 수 있다. 맨 위 한 단만 카테고리이고 그
 * 아래는 전부 하위 카테고리다 — 어느 쪽이든 frontmatter 는 여전히 모른다.
 *
 * 규약을 어긴 경로면 이유를 문자열로 돌려준다 (던지지 않는다 — 부르는 쪽이
 * 빌드에서는 중단하고 dev 에서는 건너뛰어야 하기 때문이다).
 */
export function parsePostPath(relativePath: string): FileMeta | { error: string } {
  const parts = relativePath.split('/');
  if (parts.length < 2) {
    return { error: '글은 src/content/<카테고리>/ 아래에 둔다' };
  }

  const category = parts[0];
  if (!isCategory(category)) {
    return { error: `모르는 카테고리: ${category} (${CATEGORIES.join(' · ')} 중 하나)` };
  }

  const subs = parts.slice(1, -1);
  for (const sub of subs) {
    if (!SUB.test(sub)) {
      return { error: `하위 카테고리 폴더 이름은 소문자 영문 · 숫자 · 하이픈만 (${sub})` };
    }
    if (RESERVED.has(sub)) {
      return { error: `${sub} 는 폴더 이름으로 쓸 수 없다 — 쪽 넘김 경로(/page/2)와 겹친다` };
    }
  }

  const matched = FILENAME.exec(parts[parts.length - 1]);
  if (!matched) {
    return { error: '파일명은 YYYY-MM-DD-slug.mdx (slug 는 소문자 영문 · 숫자 · 하이픈)' };
  }

  const [, date, slug] = matched;
  return { category, subs, slug, date, id: [category, ...subs, slug].join('/') };
}
