import fs from 'node:fs';
import path from 'node:path';

import type { Post } from '@/types/post';

import { IMAGES, missingImages } from '@/lib/content/images';
import {
  collectPostFiles,
  findDateMismatches,
  formatDates,
  linkPosts,
  parsePostFile,
} from '@/lib/content/parse';

import { loadEnvLocal } from './env';
import { syncRedirects } from './redirects';

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
  loadEnvLocal();

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

  // 같은 글의 두 언어판은 id 가 같다 (…-slug.mdx · …-slug.en.mdx) — 같은 글이니
  // 주소도 하나여야 하기 때문이다. 그래서 언어까지 묶어서 센다. id 만 보면
  // 번역을 하나 붙이는 순간 멀쩡한 글이 "두 번 있다"로 빌드를 멈춘다.
  const seen = new Set<string>();
  for (const { post } of parsed) {
    const key = `${post.id}:${post.locale}`;
    if (seen.has(key)) errors.push(`  ${post.id} (${post.locale}) 가 두 번 있다`);
    seen.add(key);
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

  // 아직 안 올린 이미지. 깨진 그림이 배포까지 흘러가는 것보다 빌드가 멈추는
  // 편이 낫다 — 화면에서는 조용히 빈자리가 될 뿐이라 아무도 못 본다.
  // draft 는 배포에 나가지 않으므로 묻지 않는다 (쓰는 중에 올리라고 조를 이유가 없다).
  for (const { post, body } of parsed) {
    if (post.draft) continue;
    for (const ref of missingImages(post.id, body)) {
      errors.push(`  ${post.id}\n    이미지가 R2 에 없다: ${ref} — pnpm img 를 돌릴 것`);
    }
  }

  if (Object.keys(IMAGES).length > 0 && !process.env.NEXT_PUBLIC_IMAGE_BASE_URL) {
    console.error('\n✖ NEXT_PUBLIC_IMAGE_BASE_URL 이 비어 있다 — 이미지 주소를 만들 수 없다.');
    console.error('  R2 버킷에 붙인 커스텀 도메인을 배포 환경변수에 넣을 것.\n');
    process.exit(1);
  }

  if (errors.length > 0) {
    console.error(`\n✖ 글 ${errors.length}편이 규약을 어겼다.\n`);
    console.error(errors.join('\n\n'));
    console.error('\nfrontmatter 는 title · date · summary · tags · draft 다섯 개뿐이다.\n');
    process.exit(1);
  }

  // 멈추지 않고 알리기만 한다 — 어긋난 날짜로도 사이트는 돌고, 번역을 붙이는
  // 중에 원문 날짜를 손보는 경우도 있다.
  for (const { id, dates } of findDateMismatches(parsed)) {
    console.warn(
      `⚠ ${id} — 언어판마다 date 가 다르다 (${formatDates(dates)}) · 목록 순서가 언어마다 갈린다`
    );
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

  syncRedirects(live);

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
