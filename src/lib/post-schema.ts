import { z } from 'zod';

import { CATEGORIES, type Category, isCategory } from '@/lib/categories';
import { isLocale } from '@/lib/i18n';

import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n.config';

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
  /**
   * 별점. 리뷰만 쓴다 (다른 카테고리에 적히면 parsePostFile 이 잡는다).
   *
   * 다섯 개 규약을 늘리는 게 아니라, 리뷰라는 한 종류에만 붙는 선택 칸이다 —
   * 안 적으면 목록도 글머리도 지금과 똑같이 선다. 본문에 ★★★★ 나 🟡🟡🟡🟡⚪
   * 로 적어 두면 그 글을 열어야만 보이는데, 리뷰 목록에서 별점은 제목만큼
   * 먼저 보고 싶은 값이라 frontmatter 로 뺐다.
   */
  rating: z
    .number()
    .min(0, '별점은 0 이상')
    .max(5, '별점은 5 이하')
    .multipleOf(0.5, '별점은 0.5 단위로 적는다')
    .optional(),
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
  /** 파일 이름 끝의 언어 접미사가 정한다. 접미사가 없으면 기본 언어. */
  locale: Locale;
  /** 파일명 앞의 날짜. frontmatter 와 다르면 경고한다. */
  date: string;
  /** `category/…subs/slug`. 그대로 URL 이 된다. */
  id: string;
};

/**
 * 글 파일의 확장자 — `.md` 와 `.mdx` 둘 다다.
 *
 * 렌더는 어느 쪽이든 똑같다. 본문을 컴파일하는 next-mdx-remote 는 파일이
 * 아니라 문자열을 받아서, 확장자가 컴파일러에 전달조차 되지 않는다
 * (components/MdxContent.tsx). 콜아웃 · 위키링크도 remark 플러그인이 평범한
 * 마크다운을 읽어 만든다 — MDX 문법이 아니다.
 *
 * 그런데 Obsidian 은 `.md` 만 노트로 연다. src/content 가 vault 겸용인 이상
 * (절대 규칙) 거기서 안 열리는 확장자를 강요할 이유가 없다. 그래서 `.md` 를
 * 받고, 이미 쓴 `.mdx` 도 그대로 둔다 — 한쪽으로 몰아 고칠 일이 없다.
 */
export const POST_EXT = /\.mdx?$/i;

/** 확장자를 뗀 파일 이름. `2026-08-11-slug.en.md` → `2026-08-11-slug.en` */
export function stripPostExt(name: string): string {
  return name.replace(POST_EXT, '');
}

/**
 * `2026-08-11-slug.md` 는 한국어, `2026-08-11-slug.en.md` 는 그 글의 영어판.
 * (`.mdx` 도 같다.)
 *
 * 기본 언어에는 접미사가 없다 — 주소에 접두사가 없는 것과 같은 규칙이고
 * (i18n.config 의 hideDefaultLocale), 덕분에 이미 쓴 글의 파일 이름을 하나도
 * 건드리지 않는다. slug 에는 점이 못 들어가므로 접미사와 헷갈릴 일도 없다.
 */
export const FILENAME = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.([a-z]{2}))?\.mdx?$/;

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
 * `dev/2026-08-11-next-16.md`        → { category: 'dev', subs: [], slug: 'next-16' }
 * `dev/nextjs/2026-08-11-next-16.md` → { category: 'dev', subs: ['nextjs'], … }
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
    return {
      error: '파일명은 YYYY-MM-DD-slug.md (.mdx 도 된다, slug 는 소문자 영문 · 숫자 · 하이픈)',
    };
  }

  const [, date, slug, suffix] = matched;

  // 접미사가 붙어 있으면 아는 언어여야 한다. 모양은 맞고 준비는 안 된 언어
  // (.fr.md)를 조용히 한국어 글로 세면 번역이 원문 자리를 밀어낸다.
  if (suffix !== undefined && !isLocale(suffix)) {
    return { error: `모르는 언어 접미사: .${suffix} (${LOCALES.join(' · ')} 중 하나)` };
  }
  if (suffix === DEFAULT_LOCALE) {
    return {
      error: `기본 언어(${DEFAULT_LOCALE})는 접미사를 붙이지 않는다 — ${date}-${slug}.md`,
    };
  }

  return {
    category,
    subs,
    slug,
    locale: suffix ?? DEFAULT_LOCALE,
    date,
    // id 에는 언어가 안 들어간다. 번역은 같은 글이므로 주소도 하나여야 한다.
    id: [category, ...subs, slug].join('/'),
  };
}
