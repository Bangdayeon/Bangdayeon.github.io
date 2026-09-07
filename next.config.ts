import type { NextConfig } from 'next';

import fs from 'node:fs';
import path from 'path';

/**
 * 옮긴 글의 옛 주소 → 새 주소.
 *
 * 발행한 글의 slug 를 고치거나 하위 카테고리로 내리면 주소가 바뀐다. 밖에서
 * 걸린 링크가 404 가 되지 않게, 옮길 때마다 id-redirects.json 에 한 줄 적는다.
 * 308 이라 검색엔진도 새 주소로 색인을 옮긴다.
 *
 * 표의 정합성(목적지가 실제로 있는 글인지, 아직 살아 있는 글을 가리고 있지는
 * 않은지, 연쇄 리다이렉트는 아닌지)은 `pnpm index` 가 빌드 전에 검사한다.
 */
const ID_REDIRECTS = path.join(process.cwd(), 'src', 'config', 'id-redirects.json');

/**
 * 주소에 접두사가 붙는 언어 — i18n.config 의 LOCALES 에서 기본 언어를 뺀 것.
 *
 * 여기서 i18n.config 를 import 하지 않는 이유: next.config 는 next-i18next 가
 * 초기화되기 전에 읽힌다. 언어를 늘리면 이 배열에도 한 줄 추가한다.
 */
const PREFIXED_LOCALES = ['en'];

function idRedirects() {
  const table = JSON.parse(fs.readFileSync(ID_REDIRECTS, 'utf8')) as Record<string, string>;

  return Object.entries(table).flatMap(([from, to]) => [
    // 한국어는 접두사가 없다 (hideDefaultLocale).
    { source: `/${from}`, destination: `/${to}`, permanent: true },
    ...PREFIXED_LOCALES.map(lng => ({
      source: `/${lng}/${from}`,
      destination: `/${lng}/${to}`,
      permanent: true,
    })),
  ]);
}

const nextConfig: NextConfig = {
  redirects: idRedirects,

  // 상위 디렉터리의 lockfile 을 workspace root 로 오인하지 않게 고정한다.
  turbopack: {
    root: path.resolve(process.cwd()),
  },

  // 절대 규칙 8: R2 이미지를 next/image에 물리지 않는다.
  // R2 호스트를 images.remotePatterns에 등록하면 /_next/image 최적화 경로를 타게 되고
  // Vercel 이미지 최적화 무료 한도를 소모한다. 이미지는 <Img> 컴포넌트가
  // src/config/images.json의 width/height/blur를 읽어 R2에서 직접 서빙한다.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
