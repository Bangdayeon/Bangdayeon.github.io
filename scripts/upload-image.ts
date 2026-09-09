import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import {
  type ImageManifest,
  MANIFEST_FILE,
  extractImageRefs,
  findLocalImage,
  imageId,
  refBasename,
} from '@/lib/content/images';
import { CONTENT_DIR, collectPostFiles } from '@/lib/content/parse';
import { POST_EXT, parsePostPath, stripPostExt } from '@/lib/post-schema';

import { loadEnvLocal } from './env';

/**
 * vault 의 이미지 → Cloudflare R2, 그리고 config/images.json.
 *
 * 이 스크립트가 지키는 것 두 가지.
 *
 *   1. MDX 를 고치지 않는다. 원칙이다 (docs/writing.md 8장) — 정본은 사람이 쓴
 *      그대로여야 하고, Obsidian 에서 보던 화면이 커밋 뒤에 달라지면 안 된다.
 *      그래서 본문에 적힌 파일 이름은 그대로 두고, 그게 R2 의 어느 오브젝트인지만
 *      표에 적는다.
 *   2. 원본은 커밋하지 않는다. 사진 한 장이 MDX 백 편보다 무겁고, 저장소에 한 번
 *      들어가면 히스토리에서 빠지지 않는다. _img/ 는 .gitignore 에 있다.
 *
 * 오브젝트 키에는 원본 내용의 해시가 붙는다. 그림을 고치면 키가 바뀌므로 CDN
 * 캐시를 비울 일이 없고(immutable 로 올린다), 같은 사진을 두 글에서 쓰면 키가
 * 같아 오브젝트도 하나다.
 *
 *   pnpm img              바뀐 것만 올린다
 *   pnpm img --dry-run    올리지 않고 무엇을 할지만 찍는다
 *   pnpm img --force      표에 있어도 다시 굽고 다시 올린다
 *   pnpm img --prune      어느 글도 안 쓰는 줄을 표에서 걷어낸다
 */

/** 이보다 넓으면 줄인다. 본문 폭이 720px 이라 2배수로도 남는다. */
const MAX_WIDTH = 1600;

const QUALITY = 80;

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run');
const FORCE = ARGS.has('--force');
const PRUNE = ARGS.has('--prune');

type R2 = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function readR2(): R2 | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey };
}

function sha256hex(data: crypto.BinaryLike) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key: crypto.BinaryLike, data: string) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * S3 호환 PUT 한 번. AWS SDK 를 넣지 않는 이유는 이 함수가 전부이기 때문이다 —
 * 서명 규칙(SigV4)은 문서에 박혀 있고 바뀌지 않는데, SDK 는 수십 개 패키지를
 * 끌고 온다.
 *
 * region 은 R2 에서 언제나 auto 다.
 */
async function putObject(r2: R2, key: string, body: Buffer, contentType: string) {
  const host = `${r2.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${r2.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const payloadHash = sha256hex(body);

  // 서명할 헤더. 여기 적은 것은 요청에도 똑같이 실어야 한다 (값 하나만 달라도
  // SignatureDoesNotMatch 다). content-length 는 fetch 가 알아서 붙이므로 뺀다.
  const signed: Record<string, string> = {
    'cache-control': 'public, max-age=31536000, immutable',
    'content-type': contentType,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  const names = Object.keys(signed).sort();
  const canonicalHeaders = names.map(name => `${name}:${signed[name].trim()}\n`).join('');
  const signedHeaders = names.join(';');

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${r2.secretAccessKey}`, dateStamp), 'auto'), 's3'),
    'aws4_request'
  );
  const signature = hmac(signingKey, stringToSign).toString('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${r2.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: { ...signed, authorization },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`R2 가 거절했다 (${response.status}) — ${detail}`);
  }
}

/** 오브젝트 키에 쓸 이름. 한글 · 공백 파일명이 주소에서 %EA%B0%90 이 되지 않게. */
function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return slug || 'img';
}

type Baked = { body: Buffer; contentType: string; w: number; h: number; c: string };

/**
 * 원본 → 올릴 것.
 *
 * svg 는 다시 굽지 않는다 — 래스터로 만들면 벡터인 이유가 사라진다.
 * 움직이는 gif 는 animated webp 로 간다 (장수를 세어 알아본다).
 *
 * 이미 webp 로 저장해 둔 사진은 그대로 둘 때가 있다. 아래 keepOriginal 참고 —
 * 굽는 일이 손해로 끝나는 경우다.
 */
async function bake(file: string): Promise<Baked> {
  const input = fs.readFileSync(file);
  const meta = await sharp(input).metadata();

  if (path.extname(file).toLowerCase() === '.svg') {
    return {
      body: input,
      contentType: 'image/svg+xml',
      w: meta.width ?? 0,
      h: meta.height ?? 0,
      // 벡터라 대표색을 뽑을 원본 픽셀이 없다. 자리만 비워 둔다.
      c: 'transparent',
    };
  }

  const animated = (meta.pages ?? 1) > 1;

  let pipeline = sharp(input, { animated });
  // EXIF 회전을 픽셀에 굽는다. 안 하면 세로로 찍은 사진이 화면에서 눕는다.
  if (!animated) pipeline = pipeline.rotate();

  const body = await pipeline
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  // 회전과 축소가 끝난 결과에서 다시 잰다 — 원본 metadata 는 회전 전 값이다.
  /* 다시 구운 게 원본보다 크면 원본을 쓴다.
     
     굽는 일이 하는 것은 넷이다 — 1600px 초과분 축소 · webp 변환 · EXIF 회전을
     픽셀에 굽기 · 표에 적을 치수와 대표색 재기. 앞의 셋이 전부 할 일이 없는
     사진(이미 webp · 1600px 이하 · 회전값 없음)이면 남는 건 재인코딩뿐인데,
     이미 압축된 webp 를 같은 품질로 한 번 더 구우면 용량은 늘고 화질은 한
     세대 더 깎인다. 실제로 1366px 짜리 포스터가 183KB → 193KB 로 늘었다.

     치수와 대표색은 재인코딩 없이 원본에서 그대로 잰다 — 표는 어차피 채워진다.
     오브젝트 키는 원본 내용의 해시라(objectKey) 이 갈림과 무관하게 같은
     이름이 나온다. 그래서 예전에 구워 올린 사진을 --force 로 다시 돌리면
     같은 파일 이름에 원본 바이트가 덮인다 — 고아 파일이 남지 않는다.

     조건을 셋 다 보는 이유는 크기 비교만으로는 부족해서다. 축소나 회전이
     필요한 사진은 결과가 더 작아도 원본을 쓰면 안 된다 — 그건 용량이 아니라
     픽셀이 달라져야 하는 경우다. */
  const needsResize = (meta.width ?? 0) > MAX_WIDTH;
  const needsRotate = (meta.orientation ?? 1) !== 1;
  const needsConvert = meta.format !== 'webp';
  const keepOriginal = !needsResize && !needsRotate && !needsConvert && body.length >= input.length;

  const chosen = keepOriginal ? input : body;

  const out = await sharp(chosen).metadata();
  const { dominant } = await sharp(chosen).stats();
  const hex = [dominant.r, dominant.g, dominant.b]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');

  return {
    body: chosen,
    contentType: 'image/webp',
    w: out.width ?? 0,
    // animated 는 height 가 장수만큼 이어 붙은 값이라 한 장 높이를 쓴다.
    h: out.pageHeight ?? out.height ?? 0,
    c: `#${hex}`,
  };
}

type Scope = { scope: string; file: string; body: string };

/** 검사할 대상 — 글과 고정 페이지. 두 언어판은 id 가 같아 한 줄을 함께 쓴다. */
function collectScopes(): Scope[] {
  const found: Scope[] = [];

  for (const relative of collectPostFiles()) {
    const meta = parsePostPath(relative);
    // 규약을 어긴 파일은 `pnpm index` 가 말한다. 여기서 또 멈출 이유가 없다.
    if ('error' in meta) continue;

    found.push({
      scope: meta.id,
      file: relative,
      body: fs.readFileSync(path.join(CONTENT_DIR, relative), 'utf8'),
    });
  }

  const pageDir = path.join(CONTENT_DIR, 'page');
  if (fs.existsSync(pageDir)) {
    for (const name of fs.readdirSync(pageDir)) {
      if (!POST_EXT.test(name)) continue;

      // about.md · about.en.mdx → page/about
      const base = stripPostExt(name).replace(/\.[a-z]{2}$/, '');

      found.push({
        scope: `page/${base}`,
        file: `page/${name}`,
        body: fs.readFileSync(path.join(pageDir, name), 'utf8'),
      });
    }
  }

  return found;
}

/**
 * R2 대신 이 사이트 안에 둔다 — 도메인이 없어 R2 에 커스텀 도메인을 못 붙이는
 * 동안의 자리다 (docs/deploy.md).
 *
 * 키가 원본 내용의 해시라 R2 에 올릴 때와 같은 이름이 된다. 나중에 도메인이
 * 생기면 NEXT_PUBLIC_IMAGE_BASE_URL 을 채우고 `pnpm img` 를 한 번 더 돌리는
 * 것으로 옮겨진다 — 표도 본문도 안 고친다.
 *
 * 이쪽 사진은 커밋 대상이다. 저장소가 그만큼 무거워지지만, 나중에
 * git filter-repo 로 이력에서 걷어낼 수 있다.
 */
function writePublic(key: string, body: Buffer) {
  const file = path.join(process.cwd(), 'public', ...key.split('/'));

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

function readManifest(): ImageManifest {
  if (!fs.existsSync(MANIFEST_FILE)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) as ImageManifest;
}

function writeManifest(manifest: ImageManifest) {
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right))
  );

  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)}KB`;
}

/** 원본 파일 이름 + 내용 해시. 내용이 같으면 어느 글에서 쓰든 키가 같다. */
function objectKey(ref: string, local: string, source: Buffer) {
  const hash = sha256hex(source).slice(0, 8);
  const base = refBasename(ref);
  const name = slugify(base.slice(0, base.length - path.extname(base).length));
  const ext = path.extname(local).toLowerCase() === '.svg' ? 'svg' : 'webp';

  return `img/${name}-${hash}.${ext}`;
}

async function main() {
  loadEnvLocal();

  const manifest = readManifest();
  const r2 = readR2();

  const used = new Set<string>();
  const problems: string[] = [];
  let uploaded = 0;
  let unchanged = 0;
  let bytesIn = 0;
  let bytesOut = 0;

  for (const { scope, file, body } of collectScopes()) {
    for (const ref of extractImageRefs(body)) {
      const id = imageId(scope, ref);
      // 한 글에서 같은 그림을 두 문법으로 가리켰을 수 있다 — 표에서는 한 줄이다.
      if (used.has(id)) continue;
      used.add(id);

      const local = findLocalImage(scope, ref);

      if (!local) {
        // 이미 올린 뒤 원본을 지웠으면 아무 문제가 없다 — 표가 정본이다.
        if (!manifest[id]) problems.push(`${file}\n    원본을 못 찾았다: ${ref}`);
        continue;
      }

      const source = fs.readFileSync(local);
      const key = objectKey(ref, local, source);

      if (!FORCE && manifest[id]?.key === key) {
        unchanged += 1;
        continue;
      }

      const baked = await bake(local);
      bytesIn += source.length;
      bytesOut += baked.body.length;

      const line = `${id}\n    → ${key} · ${baked.w}×${baked.h} · ${kb(source.length)} → ${kb(baked.body.length)}`;

      if (DRY_RUN) {
        console.log(`· ${line}`);
      } else if (r2) {
        await putObject(r2, key, baked.body, baked.contentType);
        console.log(`✓ ${line}`);
      } else {
        writePublic(key, baked.body);
        console.log(`✓ ${line}`);
      }

      manifest[id] = { key, w: baked.w, h: baked.h, c: baked.c };
      uploaded += 1;
    }
  }

  const orphans = Object.keys(manifest).filter(id => !used.has(id));

  if (orphans.length > 0) {
    if (PRUNE) {
      for (const id of orphans) delete manifest[id];
      console.log(`✓ 아무 글도 안 쓰는 ${orphans.length}줄을 표에서 걷어냈다`);
      console.log('  R2 의 오브젝트는 그대로다 — 지우려면 대시보드에서 직접 지울 것');
    } else {
      console.warn(`⚠ 아무 글도 안 쓰는 줄이 ${orphans.length}개 있다 (--prune 으로 걷어낸다)`);
      for (const id of orphans.slice(0, 10)) console.warn(`    ${id} → ${manifest[id].key}`);
    }
  }

  if (!DRY_RUN && (uploaded > 0 || (PRUNE && orphans.length > 0))) {
    writeManifest(manifest);
    console.log('✓ config/images.json 갱신 — 커밋에 같이 담을 것');
  }

  const where = r2 ? 'R2' : 'public/ (저장소에 커밋된다)';

  console.log(
    `\n${DRY_RUN ? '· (dry-run) ' : '✓ '}${uploaded}장 → ${where}` +
      (unchanged > 0 ? ` · 그대로 ${unchanged}장` : '') +
      (bytesIn > 0 ? ` · ${kb(bytesIn)} → ${kb(bytesOut)}` : '')
  );

  if (!r2 && uploaded > 0) {
    console.log('  R2 로 옮기려면 .env.local 의 R2_* 와 NEXT_PUBLIC_IMAGE_BASE_URL 을 채울 것');
  }

  if (problems.length > 0) {
    console.error(`\n✖ ${problems.length}건을 처리하지 못했다.\n`);
    console.error(problems.map(line => `  ${line}`).join('\n\n'));
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
