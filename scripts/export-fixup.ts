import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_LOCALE } from '@/i18n.config';

/**
 * `next build` 가 뱉은 out/ 을 GitHub Pages 가 그대로 읽을 수 있는 모양으로 고친다.
 *
 * 서버가 없는 곳에 올리는 값이다. 평소에 이 사이트를 서 있게 하는 두 가지가
 * 정적 내보내기에서는 통째로 빠지기 때문에(Next 문서의 미지원 목록에
 * Proxy 와 Redirects 가 둘 다 있다), 그 둘을 파일로 대신 만든다.
 *
 *   1. 주소에서 언어 감추기
 *      정적 내보내기는 generateI18nStaticParams 가 준 대로 /ko/… 와 /en/… 만
 *      만든다. 평소에는 src/proxy.ts 가 /dev 를 /ko/dev 로 돌려 줬는데 그게 없다.
 *      그래서 한국어 산출물을 통째로 루트로 올린다 — 이미 발행한 주소가 바뀌지
 *      않아야 하기 때문이다 (README 규약: 발행 후 id 고정).
 *
 *      옮기기만 하면 되는 건 hideDefaultLocale 덕이다. 한국어 HTML 안의 링크는
 *      이미 /dev · /about 처럼 접두사 없이 적혀 있어서, 파일 위치만 주소와
 *      맞춰 주면 손댈 곳이 없다.
 *
 *   2. 옮긴 글의 옛 주소
 *      308 을 보낼 서버가 없으니 meta refresh 문서를 한 장씩 굽는다. 검색엔진
 *      에는 308 보다 약하지만 canonical 을 같이 박아 두면 색인은 따라온다.
 *      정본은 여전히 config/id-redirects.json 이고, 나중에 서버 있는 곳으로
 *      옮기면 next.config 의 redirects 가 그대로 다시 308 을 만든다.
 *
 * 이 스크립트가 하는 일은 전부 out/ 안에서 끝난다. 소스는 건드리지 않는다.
 */

const OUT_DIR = path.join(process.cwd(), 'out');

const ID_REDIRECTS = path.join(process.cwd(), 'src', 'config', 'id-redirects.json');

/** 기본 언어의 산출물이 담긴 폴더 — 이것을 루트로 올린다. */
const DEFAULT_DIR = path.join(OUT_DIR, DEFAULT_LOCALE);

/**
 * 하위 경로에 서는 경우의 접두사 (next.config 의 basePath 와 같은 값).
 *
 * 파일이 놓이는 자리는 이것과 무관하다 — out/ 이 곧 사이트의 뿌리이기 때문이다.
 * 다만 옛 주소 문서가 적는 "옮겨 간 곳"은 브라우저가 읽는 주소라서 접두사가 붙는다.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error('out/ 이 없다. `next build` 를 먼저 돌릴 것.');
    process.exit(1);
  }

  const moved = hoistDefaultLocale();
  const flattened = flattenSegmentCache(OUT_DIR);
  const decoded = mirrorEncodedNames(OUT_DIR);
  const shims = writeRedirectShims();
  disableJekyll();

  console.log(
    `✓ ${DEFAULT_LOCALE} ${moved}개를 루트로 올렸다` +
      (flattened > 0 ? ` · 프리페치 ${flattened}개 펼침` : '') +
      (decoded > 0 ? ` · 한글 주소 ${decoded}개 이중화` : '') +
      (shims > 0 ? ` · 옛 주소 ${shims}개` : '') +
      ' · .nojekyll'
  );
}

/**
 * 세그먼트 프리페치 파일을 브라우저가 부르는 이름으로 펼친다.
 *
 * Next 16 은 링크를 미리 받아 둘 때 화면 전체가 아니라 바뀌는 조각만 받는다.
 * 그 조각의 주소는 점으로 이어져 있는데(`__next.$d$lng.….__PAGE__.txt`),
 * 내보내기는 그걸 폴더로 판다(`__next.$d$lng/…/__PAGE__.txt`). 서버가 있으면
 * 그 사이를 Next 가 이어 주지만 정적 호스트는 파일 이름 그대로만 찾는다.
 *
 * 그래서 폴더를 점으로 이은 파일로 펼쳐 둔다. 안 해도 화면은 멀쩡히 돌지만
 * (프리페치가 실패하면 전체를 다시 받는다) 링크를 가리킬 때마다 404 가 나고
 * 이동이 그만큼 느려진다.
 *
 * 이건 언어를 루트로 올린 것과 무관하다 — 손대지 않은 /en 쪽에서도 똑같이 난다.
 */
function flattenSegmentCache(dir: string): number {
  let count = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const full = path.join(dir, entry.name);

    if (entry.name === '_next') continue;

    if (entry.name.startsWith('__next.')) {
      count += flattenInto(dir, entry.name, full);
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      count += flattenSegmentCache(full);
    }
  }

  return count;
}

/** `<폴더>/a/b.txt` → `<부모>/<접두사>.a.b.txt`. */
function flattenInto(parent: string, prefix: string, dir: string): number {
  let count = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = `${prefix}.${entry.name}`;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      count += flattenInto(parent, name, full);
      continue;
    }

    fs.copyFileSync(full, path.join(parent, name));
    count += 1;
  }

  return count;
}

/**
 * out/ko/** → out/**, out/ko.html → out/index.html.
 *
 * en/ 은 제자리에 둔다 (주소에 접두사가 붙는 언어라 파일 위치가 이미 맞다).
 * 옮긴 자리에 이미 뭔가 있으면 멈춘다 — 조용히 덮으면 어느 쪽이 남았는지
 * 알 수 없고, 그건 화면에서 언어가 섞이는 형태로만 드러난다.
 */
function hoistDefaultLocale(): number {
  if (!fs.existsSync(DEFAULT_DIR)) {
    console.error(`out/${DEFAULT_LOCALE}/ 이 없다. i18n 설정이 바뀌었는지 볼 것.`);
    process.exit(1);
  }

  let count = 0;

  for (const entry of fs.readdirSync(DEFAULT_DIR)) {
    const from = path.join(DEFAULT_DIR, entry);
    const to = path.join(OUT_DIR, entry);

    if (fs.existsSync(to)) {
      console.error(`✖ ${entry} 가 루트에 이미 있다 — 덮어쓰지 않고 멈춘다.`);
      process.exit(1);
    }

    fs.renameSync(from, to);
    count += 1;
  }

  fs.rmdirSync(DEFAULT_DIR);

  // /ko 자체의 문서(홈)는 루트 문서가 된다. RSC 페이로드(.txt)도 같이 옮겨야
  // 홈으로 클라이언트 이동을 할 때 404 가 나지 않는다.
  for (const [from, to] of [
    [`${DEFAULT_LOCALE}.html`, 'index.html'],
    [`${DEFAULT_LOCALE}.txt`, 'index.txt'],
  ]) {
    const source = path.join(OUT_DIR, from);
    if (fs.existsSync(source)) {
      fs.renameSync(source, path.join(OUT_DIR, to));
      count += 1;
    }
  }

  return count;
}

/**
 * 한글 태그 주소를 디코딩된 이름으로도 한 벌 더 둔다.
 *
 * Next 는 /tags/회고 를 %ED%9A%8C%EA%B3%A0.html 이라는 이름으로 디스크에 쓴다.
 * 브라우저는 언제나 인코딩된 형태로 요청하지만, 그걸 파일로 바꾸는 방식은
 * 정적 서버마다 다르다 — 디코딩해서 찾는 서버(회고.html 을 본다)와 그대로
 * 찾는 서버(%ED%9A%8C%EA%B3%A0.html 을 본다)가 둘 다 있다.
 *
 * 어느 쪽인지 올려 보기 전에는 알 수 없고, 틀리면 한글 태그 화면만 통째로
 * 404 가 된다. 태그 몇 개짜리 복사본으로 그 불확실성을 지운다.
 */
function mirrorEncodedNames(dir: string): number {
  let count = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, entry.name);

    if (entry.isDirectory()) count += mirrorEncodedNames(from);
    if (!/%[0-9a-f]{2}/i.test(entry.name)) continue;

    let name = entry.name;
    try {
      name = decodeURIComponent(entry.name);
    } catch {
      continue; // % 가 인코딩이 아니라 이름의 일부였다
    }
    if (name === entry.name) continue;

    const to = path.join(dir, name);
    if (fs.existsSync(to)) continue;

    fs.cpSync(from, to, { recursive: true });
    count += 1;
  }

  return count;
}

/**
 * 옛 주소 한 곳당 문서 한 장. 사람은 곧바로 튕겨 나가고, 검색엔진은 canonical
 * 을 본다.
 *
 * 접두사가 붙는 언어도 같이 굽는다 — next.config 의 redirects 가 두 벌을
 * 만들던 것과 같은 규칙이다.
 */
function writeRedirectShims(): number {
  if (!fs.existsSync(ID_REDIRECTS)) return 0;

  const table = JSON.parse(fs.readFileSync(ID_REDIRECTS, 'utf8')) as Record<string, string>;
  let count = 0;

  for (const [from, to] of Object.entries(table)) {
    for (const prefix of ['', '/en']) {
      const file = path.join(OUT_DIR, ...`${prefix}/${from}`.split('/').filter(Boolean));
      const target = `${BASE_PATH}${prefix}/${to}`;

      // 이미 그 자리에 진짜 글이 있으면 가리지 않는다. `pnpm index` 가 그런
      // 줄을 걷어내지만, 걷어내기 전에 굽는 일이 없도록 여기서도 본다.
      if (fs.existsSync(`${file}.html`)) continue;

      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.html`, shim(target), 'utf8');
      count += 1;
    }
  }

  return count;
}

function shim(target: string) {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${target}</title>
    <link rel="canonical" href="${target}" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${target}" />
  </head>
  <body>
    <p>글이 <a href="${target}">${target}</a> 으로 옮겨졌다.</p>
  </body>
</html>
`;
}

/**
 * GitHub Pages 는 Jekyll 로 한 번 굽고, Jekyll 은 밑줄로 시작하는 것을 산출물에
 * 넣지 않는다. Next 의 자산이 전부 _next/ 아래에 있으므로 이 파일이 없으면
 * 스타일도 스크립트도 통째로 404 가 된다.
 */
function disableJekyll() {
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '', 'utf8');
}

main();
