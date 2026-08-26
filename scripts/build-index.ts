import fs from 'node:fs';
import path from 'node:path';

import type { Post } from '@/types/post';

import { collectPostFiles, linkPosts, parsePostFile } from '@/lib/content/parse';

/**
 * src/content/**\/*.mdx → src/data/{index,search,stats}.json
 *
 * 프로덕션 빌드가 읽는 산출물을 만든다 (dev 는 content 를 직접 읽으므로 이
 * 스크립트가 필요 없다). 검증에 하나라도 걸리면 여기서 멈춘다 — 깨진 글이
 * 배포까지 흘러가는 것보다 빌드가 실패하는 편이 낫다.
 *
 * draft 는 여기서 탈락한다. 산출물에 아예 없으므로 URL 을 직접 쳐도 404 다.
 */

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

function write(name: string, value: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const files = collectPostFiles();
  const parsed = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = parsePostFile(file);

    if ('error' in result) {
      errors.push(`  ${file}\n    ${result.error}`);
      continue;
    }
    for (const warning of result.warnings) console.warn(`⚠ ${file} — ${warning}`);

    parsed.push(result);
  }

  const seen = new Set<string>();
  for (const { post } of parsed) {
    if (seen.has(post.id)) errors.push(`  ${post.id} 가 두 번 있다`);
    seen.add(post.id);
  }

  // 글의 주소와 하위 카테고리의 주소는 같은 공간을 쓴다. dev/nextjs 라는 글이
  // 있는데 dev/nextjs/ 폴더도 있으면 /dev/nextjs 가 글인지 목록인지 정해지지
  // 않는다 — 라우트는 글을 먼저 보므로 목록이 통째로 가려진다.
  const folders = new Set(
    parsed.flatMap(({ post }) =>
      post.subs.map((_, depth) => [post.category, ...post.subs.slice(0, depth + 1)].join('/'))
    )
  );
  for (const { post } of parsed) {
    if (folders.has(post.id)) {
      errors.push(`  ${post.id} 는 같은 이름의 하위 카테고리 폴더와 주소가 겹친다`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n✖ 글 ${errors.length}편이 규약을 어겼다.\n`);
    console.error(errors.join('\n\n'));
    console.error('\nfrontmatter 는 title · date · summary · tags · draft 다섯 개뿐이다.\n');
    process.exit(1);
  }

  const { posts, missing } = linkPosts(parsed);
  for (const link of missing) {
    console.warn(`⚠ ${link.from} 의 위키링크가 가리키는 글이 없다: [[${link.target}]]`);
  }

  // draft 를 떨어뜨린 뒤, 그 글을 가리키던 related 도 같이 걷어낸다.
  const published = posts.filter(post => !post.draft);
  const live = new Set(published.map(post => post.id));
  const index: Post[] = published.map(post => ({
    ...post,
    related: post.related.filter(id => live.has(id)),
  }));

  const tagFreq: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const post of index) {
    for (const tag of post.tags) tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    const year = post.date.slice(0, 4);
    byYear[year] = (byYear[year] ?? 0) + 1;
    byCategory[post.category] = (byCategory[post.category] ?? 0) + 1;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  write('index.json', index);
  // 본문은 넣지 않는다 — 한국어 검색 라이브러리를 정할 때 다시 볼 문제다.
  write(
    'search.json',
    index.map(({ id, title, summary, tags }) => ({ id, title, summary, tags }))
  );
  write('stats.json', { total: index.length, tagFreq, byYear, byCategory });

  const drafts = posts.length - index.length;
  console.log(
    `✓ 글 ${index.length}편` +
      (drafts > 0 ? ` (draft ${drafts}편 제외)` : '') +
      ` · 태그 ${Object.keys(tagFreq).length}종` +
      ` · 링크 ${index.reduce((sum, post) => sum + post.related.length, 0) / 2}쌍` +
      (missing.length > 0 ? ` · 깨진 링크 ${missing.length}개` : '')
  );
}

main();
