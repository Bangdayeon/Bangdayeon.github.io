import fs from 'node:fs';
import path from 'node:path';

import manifest from '@/config/images.json';

import type { ImageEntry } from '@/lib/content/image-url';
import { CONTENT_DIR } from '@/lib/content/paths';
import { IMAGE_EXT } from '@/lib/mdx/wikilink';

/**
 * 본문의 이미지 ↔ R2 에 올라간 파일.
 *
 * 정본은 언제나 사람이 쓴 MDX 다 (원칙: 프로그램이 MDX 를 고치지 않는다).
 * `pnpm img` 도 본문을 건드리지 않고, 대신 "이 글의 이 파일 이름은 R2 의 이
 * 오브젝트다" 라는 표만 config/images.json 에 적는다. 화면에서 <Img> 가 같은
 * 규칙으로 그 표를 되짚는다 — 그래서 추출과 해석이 한 파일에 있다
 * (위키링크가 lib/mdx/wikilink.ts 하나를 보는 것과 같은 이유다).
 *
 * 표의 열쇠는 `글 id / 파일 이름` 이다. 글 id 는 발행 후 바뀌지 않고(README
 * 규약), 두 언어판은 id 가 같아 같은 줄을 함께 본다 — 번역본에 이미지를 다시
 * 올릴 일이 없다.
 */

/**
 * 표 한 줄과 주소 만들기는 lib/content/image-url.ts 에 있다 — 클라이언트도
 * 그 둘만은 써야 해서(<PostList> 의 썸네일) fs 가 안 딸린 조각으로 떼어 뒀다.
 * 부르는 쪽은 여기만 알면 되도록 그대로 내보낸다.
 */
export type { ImageEntry };
export { imageUrl } from '@/lib/content/image-url';

export type ImageManifest = Record<string, ImageEntry>;

export const MANIFEST_FILE = path.join(process.cwd(), 'src', 'config', 'images.json');

export const IMAGES = manifest as ImageManifest;

/**
 * 그림으로 치는 확장자. 정의는 wikilink.ts 에 있다 — [[...]] 가 링크인지
 * 그림인지 가르는 것도 같은 목록이라, 두 벌이 되면 한쪽만 늘어난다.
 */
export { IMAGE_EXT };

/** `![대체문구](경로)` — 뒤따르는 "제목"과 <꺾쇠 경로>도 받는다. */
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\(\s*<?([^)>\s]+)>?(?:\s+["'][^"'\n]*["'])?\s*\)/g;

/** `![[파일.png]]` · `![[파일.png|300]]` — Obsidian 이 붙여넣기로 넣는 형태. */
const EMBED = /!\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g;

/** 코드블록 · 인라인 코드 안의 것은 이미지가 아니다 (wikilink.ts 와 같은 규칙). */
function stripCode(body: string) {
  return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/** 밖에 있는 이미지는 우리 표의 대상이 아니다 — 적힌 주소 그대로 나간다. */
export function isExternalImage(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith('data:');
}

/**
 * 본문에 나오는 이미지들 — 적힌 그대로. 같은 파일이 두 번 나오면 한 번만.
 *
 * frontmatter 를 떼고 넘기든 통째로 넘기든 결과가 같다 (머리말에는 이미지가
 * 없다). 그래서 부르는 쪽이 본문만 골라 오지 않아도 된다.
 */
export function extractImageRefs(body: string): string[] {
  const source = stripCode(body);
  const found = new Set<string>();

  for (const match of source.matchAll(MARKDOWN_IMAGE)) {
    const url = match[1].trim();
    if (!isExternalImage(url) && IMAGE_EXT.test(url)) found.add(url);
  }

  for (const match of source.matchAll(EMBED)) {
    const target = match[1].trim();
    if (IMAGE_EXT.test(target)) found.add(target);
  }

  return [...found];
}

/**
 * 본문에 처음 나오는 이미지 — 목록의 썸네일이 이걸 쓴다.
 *
 * extractImageRefs 로 안 하는 이유는 두 가지다. 그쪽은 문법별로 모아서
 * `![[a.png]]` 가 첫 줄에 있어도 아래쪽 `![](b.png)` 가 먼저 나오고 (썸네일은
 * "맨 위 사진"이어야 한다), 밖에 걸린 주소를 아예 뺀다 (그쪽은 "올려야 할
 * 사진"을 세는 목록이라 그게 맞다). 썸네일은 밖에 건 사진도 걸 수 있다.
 *
 * 밖에 건 주소에는 확장자를 따지지 않는다 — `![]()` 로 적은 이상 그림이고,
 * 주소 끝이 `.webp?w=800` 이나 확장자 없는 길일 수도 있다.
 */
export function firstImageRef(body: string): string | null {
  const source = stripCode(body);
  const found: { at: number; ref: string }[] = [];

  for (const match of source.matchAll(MARKDOWN_IMAGE)) {
    const ref = match[1].trim();
    if (isExternalImage(ref) || IMAGE_EXT.test(ref)) found.push({ at: match.index, ref });
  }

  for (const match of source.matchAll(EMBED)) {
    const ref = match[1].trim();
    if (IMAGE_EXT.test(ref)) found.push({ at: match.index, ref });
  }

  return found.sort((a, b) => a.at - b.at)[0]?.ref ?? null;
}

/** `_img/Pasted%20image.png` → `Pasted image.png`. 못 푸는 문자열은 그대로 둔다. */
export function refBasename(ref: string): string {
  let decoded = ref;
  try {
    decoded = decodeURIComponent(ref);
  } catch {
    /* %가 인코딩이 아니라 파일 이름의 일부였다 */
  }
  return decoded.split(/[\\/]/).pop() ?? decoded;
}

/**
 * 표의 열쇠. 경로가 아니라 파일 이름만 쓴다 —
 * `![](_img/a.png)` 와 `![[a.png]]` 가 같은 그림을 가리키기 때문이다.
 */
export function imageId(scope: string, ref: string): string {
  return `${scope}/${refBasename(ref)}`;
}

export function lookupImage(scope: string, ref: string): ImageEntry | null {
  return IMAGES[imageId(scope, ref)] ?? null;
}

/**
 * vault 안의 원본. `pnpm img` 가 올릴 것을 찾을 때, 그리고 dev 가 아직 안 올린
 * 그림을 미리 보여 줄 때 쓴다.
 *
 * 글이 든 폴더를 기준으로만 본다 — 적힌 경로 그대로, 그리고 `_img/`. vault
 * 전체를 뒤지지 않는 이유는 같은 이름의 사진이 폴더마다 있기 때문이다.
 * 못 찾으면 같은 폴더에서 확장자 · 대소문자만 다른 이름을 한 번 더 찾는다.
 */
export function findLocalImage(scope: string, ref: string): string | null {
  const noteDir = path.join(CONTENT_DIR, path.dirname(scope));
  const base = refBasename(ref);

  let asWritten = ref;
  try {
    asWritten = decodeURIComponent(ref);
  } catch {
    /* 위와 같다 */
  }

  for (const candidate of [path.join(noteDir, asWritten), path.join(noteDir, '_img', base)]) {
    const resolved = path.resolve(candidate);
    // 본문이 ../.. 로 vault 밖을 가리키면 무시한다.
    if (!resolved.startsWith(path.resolve(CONTENT_DIR))) continue;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }

  // 이름은 맞는데 확장자나 대소문자가 어긋난 경우까지는 찾아 준다. 사진을
  // .png 로 받아 두고 본문에는 .webp 라고 적는 일(반대도)이 실제로 잦고, 그때
  // 화면에 서는 건 "이미지를 불러오는데에 실패했습니다" 한 줄뿐이라 무엇이
  // 어긋났는지가 안 보인다. 굽는 건 어차피 `pnpm img` 라 확장자는 참고사항이다.
  const stem = base.slice(0, base.length - path.extname(base).length).toLowerCase();

  for (const dir of [path.join(noteDir, '_img'), noteDir]) {
    if (!fs.existsSync(dir)) continue;

    const found = fs.readdirSync(dir).find(name => {
      if (!IMAGE_EXT.test(name)) return false;
      return name.slice(0, name.length - path.extname(name).length).toLowerCase() === stem;
    });

    if (found) return path.join(dir, found);
  }

  return null;
}

/**
 * 아직 R2 에 없는 이미지들. 빌드가 이걸 보고 멈춘다.
 *
 * 같은 그림을 두 문법으로 가리켰으면 한 번만 말한다 — 표에서도 한 줄이라
 * 고칠 일도 하나다.
 */
export function missingImages(scope: string, body: string): string[] {
  const missing = new Map<string, string>();

  for (const ref of extractImageRefs(body)) {
    if (lookupImage(scope, ref)) continue;
    const id = imageId(scope, ref);
    if (!missing.has(id)) missing.set(id, ref);
  }

  return [...missing.values()];
}
