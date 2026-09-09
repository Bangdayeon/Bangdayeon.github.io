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
import { POST_EXT, stripPostExt } from '@/lib/post-schema';

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

  // 같은 글이 .md 와 .mdx 로 둘 다 있으면 dev 는 먼저 온 것을 세운다 — 고친 쪽이
  // 화면에 안 나오는 상태라 눈으로는 "왜 안 바뀌지"로만 보인다. 빌드는 여기서
  // 멈추므로(build-index) dev 도 최소한 말은 해 준다.
  const seen = new Set<string>();
  for (const { post } of parsed) {
    const key = `${post.id}:${post.locale}`;
    if (seen.has(key)) {
      console.warn(`[content] ${post.id} (${post.locale}) 가 두 번 있다 — .md · .mdx 둘 다 있나`);
    }
    seen.add(key);
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

/**
 * 이 언어로 쓰인 글만 남긴다. 다른 언어판으로 대신하지 않는다.
 *
 * 예전에는 번역이 없으면 한국어판을 그 자리에 세웠다. 화면이 비지 않는다는
 * 장점이 있었지만, 같은 본문이 /글 과 /en/글 두 주소에서 그대로 나왔다 —
 * 검색엔진이 보기에 중복 문서다. robots.ts 가 /en/ 을 통째로 막아 두는 것으로
 * 버텼는데, 그건 번역을 채워도 영어판이 검색에 안 잡힌다는 뜻이었다.
 *
 * 그래서 대신 세우지 않기로 한다. 번역이 없는 글은 그 언어에서 아예 없는 글이다.
 *   - 목록 · 카테고리 개수에서 빠진다
 *   - generateStaticParams 가 그 경로를 만들지 않고, dynamicParams = false 라
 *     주소 자체가 존재하지 않는다 (404)
 *   - sitemap 도 그 언어를 hreflang 으로 짝지어 주지 않는다
 *
 * 양쪽 모두에 대칭으로 적용된다. 영어로만 쓴 글은 한국어 화면에 안 나온다 —
 * 한쪽만 예외를 두면 "번역이 없으면 없는 글"이라는 규칙이 반쪽이 된다.
 *
 * id 로 묶어 고르던 일이 없어졌지만 중복은 여전히 걸린다. 같은 id · 같은
 * 언어가 두 번 있으면 pnpm index 가 빌드를 멈춘다 (scripts/build-index.ts).
 */
function pickLocale(posts: Post[], locale: Locale): Post[] {
  return posts.filter(post => post.locale === locale);
}

/**
 * 글 본문. 목록과 달리 본문은 어느 환경에서나 파일에서 읽는다 —
 * index.json 에 본문까지 넣으면 목록 한 번 읽는 데 사이트 전체가 딸려 온다.
 *
 * 파일명은 보통 `${date}-${slug}${접미사}.md` 지만, frontmatter 날짜를 고치고
 * 파일명을 안 바꿨을 수도 있어서 못 찾으면 폴더를 뒤져 slug 로 찾는다.
 * 확장자는 `.md` · `.mdx` 둘 다 본다 (post-schema 의 POST_EXT).
 *
 * 접미사는 post.locale 이 정한다 — 목록에서 고른 그 언어판의 본문을 읽어야
 * 한다. 한국어판을 찾을 때 `-slug` 로 끝나는 이름만 보므로 `-slug.en.md`
 * 가 섞여 들어오지 않는다.
 */
export function loadBody(post: Post): string | null {
  const dir = path.join(CONTENT_DIR, post.category, ...post.subs);
  const suffix = post.locale === DEFAULT_LOCALE ? '' : `.${post.locale}`;
  const stem = `${post.slug}${suffix}`;

  for (const ext of ['md', 'mdx']) {
    const guess = path.join(dir, `${post.date}-${stem}.${ext}`);
    if (fs.existsSync(guess)) return body(guess);
  }

  if (!fs.existsSync(dir)) return null;
  const found = fs.readdirSync(dir).find(name => {
    if (!POST_EXT.test(name)) return false;
    const base = stripPostExt(name);
    return base.endsWith(`-${stem}`) || base === stem;
  });

  return found ? body(path.join(dir, found)) : null;
}

/** frontmatter 를 떼고 본문만. MDX 컴파일러에 머리말을 넘길 이유가 없다. */
function body(file: string): string {
  return matter(fs.readFileSync(file, 'utf8')).content;
}
