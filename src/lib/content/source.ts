import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import 'server-only';

import type { Post } from '@/types/post';

import { CONTENT_DIR, collectPostFiles, linkPosts, parsePostFile } from '@/lib/content/parse';

/**
 * 글 목록의 출처.
 *
 *   dev  → src/content 를 직접 읽는다. 파일을 고치고 새로고침하면 바로 보인다.
 *          watch 프로세스도, 재생성 명령도 없다.
 *   prod → scripts/build-index.ts 가 구워 둔 src/data/index.json 을 읽는다.
 *          draft 는 애초에 들어 있지 않다.
 *
 * dev 에서 검증에 실패한 글은 건너뛰고 경고만 남긴다. 쓰다 만 글 하나 때문에
 * 사이트 전체가 죽으면 그게 곧 글쓰기 마찰이다. 프로덕션은 스크립트가 이미
 * 중단시켰으므로 여기까지 오지 않는다.
 */

const INDEX_FILE = path.join(process.cwd(), 'src', 'data', 'index.json');

const isDev = process.env.NODE_ENV !== 'production';

/** 파일이 그대로면 다시 파싱하지 않는다. 30편 stat 은 1ms 도 안 걸린다. */
let devCache: { key: string; posts: Post[] } | null = null;
let prodCache: Post[] | null = null;

function readFromContent(): Post[] {
  const files = collectPostFiles();

  const key = files
    .map(file => {
      const stat = fs.statSync(path.join(CONTENT_DIR, file));
      return `${file}:${stat.mtimeMs}`;
    })
    .join('|');

  if (devCache?.key === key) return devCache.posts;

  const parsed = [];
  for (const file of files) {
    const result = parsePostFile(file);

    if ('error' in result) {
      console.warn(`[content] ${file} 를 건너뛴다 — ${result.error}`);
      continue;
    }
    for (const warning of result.warnings) console.warn(`[content] ${file} — ${warning}`);

    parsed.push(result);
  }

  const { posts, missing } = linkPosts(parsed);
  for (const link of missing) {
    console.warn(`[content] ${link.from} 의 위키링크가 가리키는 글이 없다: [[${link.target}]]`);
  }

  devCache = { key, posts };
  return posts;
}

function readFromIndex(): Post[] {
  if (prodCache) return prodCache;

  if (!fs.existsSync(INDEX_FILE)) {
    throw new Error('src/data/index.json 이 없다. `pnpm index` 를 먼저 돌릴 것.');
  }

  prodCache = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) as Post[];
  return prodCache;
}

/** 정렬된 전체 목록. dev 에서는 draft 도 들어 있다. */
export function loadPosts(): Post[] {
  return isDev ? readFromContent() : readFromIndex();
}

/**
 * 글 본문. 목록과 달리 본문은 어느 환경에서나 파일에서 읽는다 —
 * index.json 에 본문까지 넣으면 목록 한 번 읽는 데 사이트 전체가 딸려 온다.
 *
 * 파일명은 보통 `${date}-${slug}.mdx` 지만, frontmatter 날짜를 고치고 파일명을
 * 안 바꿨을 수도 있어서 못 찾으면 폴더를 뒤져 slug 로 찾는다.
 */
export function loadBody(post: Post): string | null {
  const dir = path.join(CONTENT_DIR, post.category, ...post.subs);
  const guess = path.join(dir, `${post.date}-${post.slug}.mdx`);
  if (fs.existsSync(guess)) return body(guess);

  if (!fs.existsSync(dir)) return null;
  const found = fs
    .readdirSync(dir)
    .find(name => name.endsWith(`-${post.slug}.mdx`) || name === `${post.slug}.mdx`);

  return found ? body(path.join(dir, found)) : null;
}

/** frontmatter 를 떼고 본문만. MDX 컴파일러에 머리말을 넘길 이유가 없다. */
function body(file: string): string {
  return matter(fs.readFileSync(file, 'utf8')).content;
}

/** content/page/*.mdx — 글이 아니라 고정 페이지 (about 등). 검증도 색인도 없다. */
export function loadPage(name: string): string | null {
  const file = path.join(CONTENT_DIR, 'page', `${name}.mdx`);
  return fs.existsSync(file) ? body(file) : null;
}
