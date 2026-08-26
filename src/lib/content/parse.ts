import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeTag } from '@/config/tag-alias';

import type { Post } from '@/types/post';

import { CATEGORIES } from '@/lib/categories';
import { type LinkTarget, extractWikilinks, resolveWikilink } from '@/lib/mdx/wikilink';
import { frontmatterSchema, parsePostPath } from '@/lib/post-schema';

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

export const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

/**
 * `dev/2026-08-11-slug.mdx` · `dev/nextjs/2026-08-11-slug.mdx` 같은 상대 경로.
 *
 * 카테고리 폴더에서 시작해 아래로 내려간다 — 하위 카테고리는 폴더를 한 단 더
 * 판 것일 뿐이라 따로 등록할 곳이 없다. 카테고리 폴더만 훑으므로 content 바로
 * 아래의 .obsidian · .trash · _templates · page 는 자연히 빠지고, 그 안쪽에서도
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
      else if (entry.isFile() && entry.name.endsWith('.mdx'))
        found.push(`${relative}/${entry.name}`);
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

  const warnings: string[] = [];
  if (parsed.data.date !== meta.date) {
    // 파일명 날짜는 정렬용 표기일 뿐이고 정본은 frontmatter 다. 다르면
    // 목록 순서와 파일 이름이 어긋나 보이므로 알려만 준다.
    warnings.push(`파일명 날짜(${meta.date})와 frontmatter date(${parsed.data.date})가 다르다`);
  }

  return {
    post: {
      id: meta.id,
      category: meta.category,
      subs: meta.subs,
      slug: meta.slug,
      title: parsed.data.title,
      date: parsed.data.date,
      summary: parsed.data.summary,
      tags: parsed.data.tags.map(normalizeTag),
      draft: parsed.data.draft,
      related: [],
    },
    body: content,
    file: path.basename(relativePath, '.mdx'),
    warnings,
  };
}

export type MissingLink = { from: string; target: string };

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
