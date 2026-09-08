import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import 'server-only';

import type { Post } from '@/types/post';

import {
  CONTENT_DIR,
  collectPostFiles,
  findDateMismatches,
  formatDates,
  linkPosts,
  parsePostFile,
} from '@/lib/content/parse';

import { DEFAULT_LOCALE, type Locale } from '@/i18n.config';

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

  for (const { id, dates } of findDateMismatches(parsed)) {
    console.warn(`[content] ${id} — 언어판마다 date 가 다르다 (${formatDates(dates)})`);
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

/**
 * 이 언어로 읽을 목록 — id 하나당 한 편. dev 에서는 draft 도 들어 있다.
 *
 * 번역이 있으면 번역판을, 없으면 원문을 그 자리에 그대로 세운다. 영어 화면에서
 * 목록이 텅 비는 것보다 원문이라도 서 있는 편이 낫고, 그게 번역이 아니라는
 * 사실은 목록의 언어 배지가 말한다 (post.locale 이 화면 언어와 다르면 뜬다).
 *
 * 방향을 가리지 않는다 — 영어로만 쓴 글은 한국어 화면에도 영어판이 선다.
 */
export function loadPosts(locale: Locale): Post[] {
  return pickLocale(isDev ? readFromContent() : readFromIndex(), locale);
}

/** 같은 id 가 여럿이면 이 언어판을, 없으면 먼저 온 것을 남긴다 (입력은 최신순). */
function pickLocale(posts: Post[], locale: Locale): Post[] {
  const byId = new Map<string, Post>();

  for (const post of posts) {
    const standing = byId.get(post.id);
    // Map 은 같은 키에 다시 넣어도 자리(=날짜 순서)를 지킨다.
    if (!standing || (post.locale === locale && standing.locale !== locale)) {
      byId.set(post.id, post);
    }
  }

  return [...byId.values()];
}

/**
 * 글 본문. 목록과 달리 본문은 어느 환경에서나 파일에서 읽는다 —
 * index.json 에 본문까지 넣으면 목록 한 번 읽는 데 사이트 전체가 딸려 온다.
 *
 * 파일명은 보통 `${date}-${slug}${접미사}.mdx` 지만, frontmatter 날짜를 고치고
 * 파일명을 안 바꿨을 수도 있어서 못 찾으면 폴더를 뒤져 slug 로 찾는다.
 *
 * 접미사는 post.locale 이 정한다 — 목록에서 고른 그 언어판의 본문을 읽어야
 * 한다. 한국어판을 찾을 때 `-slug.mdx` 로 끝나는 파일만 보므로 `-slug.en.mdx`
 * 가 섞여 들어오지 않는다.
 */
export function loadBody(post: Post): string | null {
  const dir = path.join(CONTENT_DIR, post.category, ...post.subs);
  const suffix = post.locale === DEFAULT_LOCALE ? '' : `.${post.locale}`;

  const guess = path.join(dir, `${post.date}-${post.slug}${suffix}.mdx`);
  if (fs.existsSync(guess)) return body(guess);

  if (!fs.existsSync(dir)) return null;
  const found = fs
    .readdirSync(dir)
    .find(
      name => name.endsWith(`-${post.slug}${suffix}.mdx`) || name === `${post.slug}${suffix}.mdx`
    );

  return found ? body(path.join(dir, found)) : null;
}

/** frontmatter 를 떼고 본문만. MDX 컴파일러에 머리말을 넘길 이유가 없다. */
function body(file: string): string {
  return matter(fs.readFileSync(file, 'utf8')).content;
}
