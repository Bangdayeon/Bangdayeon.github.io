import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { collectPostFiles, parsePostFile } from '@/lib/content/parse';
import { FILENAME } from '@/lib/post-schema';

/**
 * 글이 어디에서 어디로 옮겨졌는지를 git 에게 묻는다.
 *
 * 주소가 파일 경로에서 나오는 구조라, 이름을 바꾸는 순간 옛 주소는 작업 트리
 * 어디에도 남지 않는다. 새 상태만 보고는 그 글이 예전에 무엇이었는지 알 수
 * 없다 — 그래서 리다이렉트 표를 사람이 적어야 했다.
 *
 * 옛 이름을 기억하는 곳이 하나 있다. git 이다. 이름 변경은 커밋에 R 로 남고
 * (git 은 경로가 아니라 내용 유사도로 알아본다), 그걸 읽으면 표를 손으로 적을
 * 이유가 없어진다. 파일 이름은 아무렇게나 바꿔도 된다 — Obsidian 이든
 * 탐색기든, git 이 알아보기만 하면 된다.
 */

const CONTENT_PREFIX = 'src/content/';

/** next.config 의 redirects 가 읽는 표. 손으로 적지 않는다 — git 이 채운다. */
const REDIRECTS_FILE = path.join(process.cwd(), 'src', 'config', 'id-redirects.json');

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    // git 이 없거나 저장소가 아니다. 부르는 쪽이 "감지 못 함"으로 다룬다.
    return null;
  }
}

/**
 * 이력이 잘린 클론에서는 감지하지 않는다.
 *
 * CI 는 대개 얕게(shallow) 클론한다 — 거기서 표를 다시 만들면 오래된 이동을
 * 못 보고 멀쩡한 리다이렉트를 지워 버린다. 표는 커밋해 두는 파일이므로,
 * 이력이 온전한 로컬에서만 갱신하고 CI 는 커밋된 것을 그대로 쓰면 된다.
 */
function usable(): boolean {
  return git(['rev-parse', '--is-shallow-repository'])?.trim() === 'false';
}

/** `R100\told\tnew` 꼴만 걷어낸다. slug 규칙상 경로에 공백이 없어 탭으로 갈라도 안전하다. */
function parseRenames(output: string | null): { from: string; to: string }[] {
  if (!output) return [];

  return output
    .split('\n')
    .map(line => line.split('\t'))
    .filter(parts => parts.length === 3 && parts[0].startsWith('R'))
    .map(([, from, to]) => ({ from, to }));
}

/**
 * `src/content/dev/2026-08-11-slug.mdx` → `dev/slug`. 글이 아니면 null.
 *
 * 여기서는 parsePostPath 를 쓰지 않는다. 그쪽은 "지금 규약에 맞는 글인가"를
 * 보는데, 출발지는 지금 규약에 맞을 이유가 없기 때문이다 — 카테고리 이름을
 * log 에서 diary 로 갈면 옛 경로의 log 는 더 이상 카테고리가 아니고, 그러면
 * 이동을 통째로 못 본 채 옛 주소가 조용히 404 가 된다.
 *
 * 옛 주소는 지금 유효한 카테고리가 아니라 그때 밖에 나간 주소다. 그래서 폴더
 * 이름은 따지지 않고 파일 이름 모양만 본다. 목적지가 실제로 있는 글인지는
 * syncRedirects 의 live 검사가 따로 막는다.
 *
 * 날짜와 언어 접미사는 주소에서 빠진다 (post-schema 의 id 와 같은 규칙).
 */
function toId(gitPath: string): string | null {
  if (!gitPath.startsWith(CONTENT_PREFIX)) return null;

  const parts = gitPath.slice(CONTENT_PREFIX.length).split('/');
  if (parts.length < 2) return null;

  const matched = FILENAME.exec(parts[parts.length - 1]);
  if (!matched) return null;

  return [...parts.slice(0, -1), matched[2]].join('/');
}

/**
 * 옛 주소 → 지금 주소.
 *
 * 이력이 없거나 얕은 클론이면 null — "모르겠다"와 "이동이 없다"는 다르다.
 * 전자에서 표를 다시 쓰면 안 된다.
 *
 * 커밋된 이력을 오래된 것부터 훑고, 마지막에 staged 변경을 얹는다. 방금
 * 이름을 바꾸고 `git add` 만 한 상태에서도 표가 채워지라고 그렇게 한다.
 */
export function detectMoves(): Map<string, string> | null {
  if (!usable()) return null;

  const history = parseRenames(
    git([
      'log',
      '--reverse',
      '--diff-filter=R',
      '--find-renames',
      '--name-status',
      '--format=',
      '--',
      'src/content',
    ])
  );
  const staged = parseRenames(
    git(['diff', '--cached', '--find-renames', '--name-status', '--', 'src/content'])
  );

  const moves = new Map<string, string>();

  for (const { from, to } of [...history, ...staged]) {
    const oldId = toId(from);
    const newId = toId(to);

    // 날짜만 고친 경우가 여기 걸린다 — 주소는 날짜를 떼고 만들므로 안 바뀐다.
    if (oldId === null || newId === null || oldId === newId) continue;

    // 이 글을 가리키던 옛 주소들을 새 주소로 당겨 온다. A→B→C 를 A→C 로
    // 접어 두지 않으면 리다이렉트가 두 번 튕기고, 표 검사도 연쇄로 잡는다.
    for (const [start, target] of moves) {
      if (target === oldId) moves.set(start, newId);
    }
    moves.set(oldId, newId);
  }

  // 돌고 돌아 제자리로 온 글. 리다이렉트가 자기 자신을 가리키면 무한 루프다.
  for (const [from, to] of moves) {
    if (from === to) moves.delete(from);
  }

  return moves;
}

/**
 * 지금 배포되는 글의 주소들. draft 와 규약을 어긴 글은 빠진다.
 *
 * 리다이렉트 표를 검사하려면 "이 주소에 글이 있느냐"만 알면 되므로, 위키링크를
 * 잇는 무거운 단계(linkPosts)는 건너뛴다 — 커밋 훅이 이걸 부른다.
 */
export function livePostIds(): Set<string> {
  const ids = new Set<string>();

  for (const file of collectPostFiles()) {
    const result = parsePostFile(file);
    if ('error' in result || result.post.draft) continue;
    ids.add(result.post.id);
  }

  return ids;
}

/**
 * 옮긴 글의 리다이렉트 표를 git 이 기억하는 이동으로 다시 만든다.
 *
 * 글의 파일 이름을 바꾸면 주소가 바뀌고, 밖에서 걸린 링크는 404 가 된다.
 * 그 표를 사람이 적게 하면 언젠가 빠뜨린다 — 빠뜨려도 화면에는 아무 표시가
 * 안 나기 때문에 더 그렇다. 그래서 이름만 바꾸면 여기서 알아서 채운다.
 *
 * 이력을 못 읽는 곳(얕은 클론 · git 없음)에서는 다시 만들지 않고 커밋된 표를
 * 그대로 쓴다. 거기서 새로 만들면 오래된 이동을 못 보고 멀쩡한 리다이렉트를
 * 지워 버린다.
 *
 * 어긋난 줄은 빌드를 멈추지 않고 걷어낸다. 표를 사람이 적지 않으므로 멈춰 봐야
 * 고칠 사람이 없고, 리다이렉트는 지우는 쪽이 언제나 안전하기 때문이다 —
 * 남겨 두면 멀쩡한 글을 가리지만(리다이렉트가 파일 시스템보다 먼저 걸린다),
 * 지우면 옛 주소가 404 가 될 뿐이다. 걷어내는 경우는 둘이다:
 *
 *   출발지가 살아 있다  글을 제자리로 되돌렸거나, 그 주소에 새 글이 앉았다
 *   목적지가 없다        옮긴 뒤에 지웠거나 draft 로 내렸다
 *
 * 표가 바뀌었으면 true. 커밋 훅이 그때만 git add 한다.
 */
export function syncRedirects(live: Set<string>): boolean {
  const committed = JSON.parse(fs.readFileSync(REDIRECTS_FILE, 'utf8')) as Record<string, string>;
  const detected = detectMoves();

  // 커밋된 표를 바탕으로 깐다. git 이 본 이동이 있으면 그쪽이 이긴다.
  const table = { ...committed, ...Object.fromEntries(detected ?? []) };
  const final: Record<string, string> = {};

  for (const [from, to] of Object.entries(table)) {
    if (live.has(from)) {
      console.warn(`⚠ ${from} 에 글이 있다 — 그 주소를 가리지 않게 리다이렉트를 걷어낸다`);
      continue;
    }
    if (!live.has(to)) {
      console.warn(`⚠ ${from} → ${to} · 목적지가 없어 리다이렉트를 걷어낸다`);
      continue;
    }
    final[from] = to;
  }

  if (detected === null) {
    console.warn('⚠ git 이력을 못 읽어 이동 감지를 건너뛴다 — 커밋된 표를 그대로 쓴다');
  }

  const changed = JSON.stringify(final) !== JSON.stringify(committed);
  if (!changed) return false;

  for (const [from, to] of Object.entries(final)) {
    if (committed[from] !== to) console.log(`✓ 이동 감지: ${from} → ${to}`);
  }
  fs.writeFileSync(REDIRECTS_FILE, `${JSON.stringify(final, null, 2)}\n`, 'utf8');

  return true;
}
