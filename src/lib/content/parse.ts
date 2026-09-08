import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeTag } from '@/config/tag-alias';

import type { Post } from '@/types/post';

import { CATEGORIES } from '@/lib/categories';
import { firstImageRef, isExternalImage, lookupImage } from '@/lib/content/images';
import { CONTENT_DIR } from '@/lib/content/paths';
import { type LinkTarget, extractWikilinks, resolveWikilink } from '@/lib/mdx/wikilink';
import { POST_EXT, frontmatterSchema, parsePostPath, stripPostExt } from '@/lib/post-schema';

import type { Locale } from '@/i18n.config';

/**
 * MDX 파일 → Post.
 *
 * dev 의 직독 경로(lib/content/source.ts)와 빌드 스크립트(scripts/build-index.ts)가
 * 같은 함수를 쓴다. 규칙이 두 벌이 되면 "로컬에선 보이는데 배포하면 없는 글"
 * 같은 게 생긴다.
 *
 * 여기서는 절대 던지지 않는다 — 실패를 값으로 돌려주고, 빌드는 중단할지
 * dev 는 건너뛸지 부르는 쪽이 정한다.
 */

/** 정의는 paths.ts 에 있다 (images.ts 와 서로 붙들지 않으려고). 부르는 쪽은 여기로 온다. */
export { CONTENT_DIR };

/**
 * `dev/2026-08-11-slug.md` · `dev/nextjs/2026-08-11-slug.mdx` 같은 상대 경로.
 * 확장자는 `.md` · `.mdx` 둘 다 받는다 (post-schema 의 POST_EXT).
 *
 * 카테고리 폴더에서 시작해 아래로 내려간다 — 하위 카테고리는 폴더를 한 단 더
 * 판 것일 뿐이라 따로 등록할 곳이 없다. 카테고리 폴더만 훑으므로 content 바로
 * 아래의 .obsidian · .trash · _templates 는 자연히 빠지고, 그 안쪽에서도
 * 점 · 밑줄로 시작하는 폴더는 건너뛴다.
 */
export function collectPostFiles(): string[] {
  const found: string[] = [];

  const walk = (relative: string) => {
    const dir = path.join(CONTENT_DIR, relative);
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

      if (entry.isDirectory()) walk(`${relative}/${entry.name}`);
      else if (entry.isFile() && POST_EXT.test(entry.name)) found.push(`${relative}/${entry.name}`);
    }
  };

  for (const category of CATEGORIES) walk(category);

  return found.sort();
}

export type ParsedPost = {
  /** related 는 아직 비어 있다. linkPosts 가 채운다. */
  post: Post;
  body: string;
  /** 확장자 없는 파일명. 위키링크가 이 이름으로 가리킨다. */
  file: string;
  warnings: string[];
};

export function parsePostFile(relativePath: string): ParsedPost | { error: string } {
  const meta = parsePostPath(relativePath);
  if ('error' in meta) return meta;

  const raw = fs.readFileSync(path.join(CONTENT_DIR, relativePath), 'utf8');
  const { data, content } = matter(raw);

  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map(issue => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
      .join(' / ');
    return { error: detail };
  }

  // 별점은 리뷰의 것이다. 다른 칸에 적히면 목록 어디에도 안 나오므로,
  // 조용히 무시하는 대신 여기서 잡는다.
  if (parsed.data.rating !== undefined && meta.category !== 'review') {
    return { error: 'rating 은 review 카테고리의 글에만 적는다' };
  }

  const warnings: string[] = [];
  if (parsed.data.date !== meta.date) {
    // 파일명 날짜는 정렬용 표기일 뿐이고 정본은 frontmatter 다. 다르면
    // 목록 순서와 파일 이름이 어긋나 보이므로 알려만 준다.
    warnings.push(`파일명 날짜(${meta.date})와 frontmatter date(${parsed.data.date})가 다르다`);
  }

  // 목록 왼쪽에 세울 썸네일 — 본문의 첫 사진이다.
  //
  // 밖에 걸린 주소면 그대로 쓴다 (본문에서 <Img> 가 하는 것과 같다). 우리
  // 사진이면 표에서 크기 · 대표색까지 가져온다 — 그래야 목록이 자리를 미리
  // 잡는다. 아직 안 올려서 표에 줄이 없으면 썸네일 없이 선다. dev 에서 본문의
  // 그림은 원본을 실어 보여 주지만(<Img> 의 DevPreview) 목록은 그럴 수 없다 —
  // 한 화면에 스무 편이 서고, 그 전부에 원본을 실으면 목록이 수십 MB 가 된다.
  const ref = firstImageRef(content);
  const thumb = !ref ? null : isExternalImage(ref) ? { src: ref } : lookupImage(meta.id, ref);

  return {
    post: {
      id: meta.id,
      category: meta.category,
      subs: meta.subs,
      slug: meta.slug,
      locale: meta.locale,
      title: parsed.data.title,
      date: parsed.data.date,
      summary: parsed.data.summary,
      tags: parsed.data.tags.map(normalizeTag),
      draft: parsed.data.draft,
      ...(parsed.data.rating !== undefined && { rating: parsed.data.rating }),
      ...(thumb && { thumb }),
      related: [],
    },
    body: content,
    file: stripPostExt(path.basename(relativePath)),
    warnings,
  };
}

export type MissingLink = { from: string; target: string };

export type DateMismatch = {
  /** 두 언어판이 함께 쓰는 글 id. */
  id: string;
  /** 언어판마다 적힌 날짜. 언제나 둘 이상이다. */
  dates: { locale: Locale; date: string }[];
};

/**
 * 같은 글의 언어판끼리 날짜가 어긋난 것.
 *
 * 번역은 같은 글이라 id 를 공유하지만(주소도 하나다) 날짜는 각자의 frontmatter
 * 에서 온다. 어긋나면 목록 · 아카이브 · 연표가 언어마다 같은 글을 다른 자리에
 * 세운다 — 한국어로 보면 8월 글인데 영어로 보면 9월 글이 되는 식이다.
 *
 * 화면이 깨지지 않아서 눈으로는 거의 안 잡힌다. 그래서 기계가 말해 준다.
 *
 * 멈추지는 않는다 — 번역을 붙이는 김에 원문 날짜를 손보는 중일 수도 있고, 그
 * 상태로도 사이트는 멀쩡히 돈다. 파일명 날짜 경고와 같은 급이다.
 */
export function findDateMismatches(parsed: ParsedPost[]): DateMismatch[] {
  const byId = new Map<string, DateMismatch['dates']>();

  for (const { post } of parsed) {
    byId.set(post.id, [...(byId.get(post.id) ?? []), { locale: post.locale, date: post.date }]);
  }

  return [...byId]
    .filter(([, dates]) => new Set(dates.map(entry => entry.date)).size > 1)
    .map(([id, dates]) => ({ id, dates }));
}

/** 경고 한 줄로 적을 때 쓰는 표기 — 'ko: 2026-08-11 · en: 2026-09-01'. */
export function formatDates(dates: DateMismatch['dates']): string {
  return dates.map(({ locale, date }) => `${locale}: ${date}`).join(' · ');
}

/**
 * 본문의 위키링크를 읽어 related 를 채우고 최신순으로 세운다.
 *
 * 링크는 적은 쪽에서만 걸어도 양쪽에 선이 생긴다 (그래프는 무방향이다).
 * 가리키는 글이 없으면 채우지 않고 목록으로 돌려준다 — 부르는 쪽이 경고한다.
 */
export function linkPosts(parsed: ParsedPost[]): { posts: Post[]; missing: MissingLink[] } {
  const targets: LinkTarget[] = parsed.map(({ post, file }) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    file,
  }));

  // id 하나에 Set 하나다 — 같은 글의 두 언어판은 id 가 같아 같은 칸을 쓴다.
  // 어느 쪽 본문에 적은 링크든 양쪽 언어판의 related 에 함께 들어간다. 번역본에만
  // 링크를 적었다고 그래프가 갈라지면 안 된다.
  const related = new Map<string, Set<string>>(parsed.map(({ post }) => [post.id, new Set()]));
  const missing: MissingLink[] = [];

  for (const { post, body } of parsed) {
    for (const link of extractWikilinks(body)) {
      const found = resolveWikilink(link.target, targets);

      if (!found) {
        missing.push({ from: post.id, target: link.target });
        continue;
      }
      if (found.id === post.id) continue;

      related.get(post.id)?.add(found.id);
      related.get(found.id)?.add(post.id);
    }
  }

  const posts = parsed
    .map(({ post }) => ({ ...post, related: [...(related.get(post.id) ?? [])].sort() }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { posts, missing };
}
