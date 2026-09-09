import fs from 'node:fs';
import path from 'node:path';
import 'server-only';

import { cn } from '@/lib/cn';
import {
  findLocalImage,
  imageUrl,
  isExternalImage,
  lookupImage,
  refBasename,
} from '@/lib/content/images';

/**
 * 본문의 이미지 한 장.
 *
 * 절대 규칙 8 — next/image 에 물리지 않는다. R2 는 CDN 이 앞에 서 있고 egress
 * 가 공짜라, /_next/image 를 한 번 더 태워 봐야 Vercel 의 최적화 한도(무료
 * 1,000장/월)만 깎아 먹는다. 크기를 줄이고 webp 로 굽는 일은 올릴 때 `pnpm img`
 * 가 한 번만 한다.
 *
 * 서버 전용이다. config/images.json 은 글이 늘수록 커지는 표라, 클라이언트
 * 컴포넌트가 이걸 import 하면 표 전체가 모든 페이지의 JS 번들에 실린다 —
 * 정작 한 페이지가 쓰는 건 서너 줄인데. 'server-only' 가 그 실수를 빌드에서
 * 잡는다.
 */

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

/** dev 미리보기로 통째로 실어 나를 원본의 한계. 넘으면 안내만 세운다. */
const INLINE_LIMIT = 4 * 1024 * 1024;

const isDev = process.env.NODE_ENV !== 'production';

const FRAME = 'border-line my-6 rounded-lg border';

export function Img({
  src,
  alt,
  scope,
  className,
}: {
  src?: string;
  alt?: string;
  /** 이 이미지가 실린 글의 id. 같은 파일 이름이 글마다 따로 놀게 하는 열쇠다. */
  scope: string;
  className?: string;
}) {
  const text = alt ?? '';

  if (!src) return null;

  // 밖에 걸린 주소는 우리 표를 거치지 않는다.
  if (isExternalImage(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 절대 규칙 8
      <img
        src={src}
        alt={text}
        loading="lazy"
        decoding="async"
        // 밖에 걸린 주소는 크기를 모른 채 온다 — 1000px 짜리 포스터가 375px
        // 화면을 밀어내지 않게, 폭 상한만은 우리 사진과 똑같이 건다.
        className={cn(FRAME, 'h-auto max-w-full', className)}
      />
    );
  }

  const entry = lookupImage(scope, src);

  if (entry) {
    const url = imageUrl(entry);

    return (
      // eslint-disable-next-line @next/next/no-img-element -- 절대 규칙 8
      <img
        src={url}
        alt={text}
        width={entry.w}
        height={entry.h}
        loading="lazy"
        decoding="async"
        // 내려받기 전 자리를 대표색으로 채운다. 흰 칸이 번쩍이지 않고,
        // width/height 와 함께라면 글이 아래로 밀리지도 않는다.
        style={{ backgroundColor: entry.c }}
        className={cn(FRAME, 'h-auto max-w-full', className)}
      />
    );
  }

  // 아직 안 올린 그림. 프로덕션은 여기까지 오지 않는다 — `pnpm index` 가
  // 표에 없는 이미지를 보면 빌드를 멈춘다.
  if (isDev) return <DevPreview scope={scope} src={src} alt={text} className={className} />;

  return null;
}

/**
 * 올리기 전에도 글을 쓰면서 보이게 한다 (dev 전용).
 *
 * 원본을 그대로 실어 보낸다. 라우트를 하나 파는 것보다 이쪽이 작고, dev 에서만
 * 도는 길이라 무게가 배포에 남지 않는다.
 */
function DevPreview({
  scope,
  src,
  alt,
  className,
}: {
  scope: string;
  src: string;
  alt: string;
  className?: string;
}) {
  const file = findLocalImage(scope, src);

  const notice = (message: string) => (
    <span
      className={cn(
        FRAME,
        'text-meta text-ink-muted bg-surface-muted block px-3 py-2 font-mono',
        className
      )}
    >
      {message}
    </span>
  );

  // 본문은 파일 이름만 가리키므로, 못 찾았다는 건 그 이름의 사진이 글 옆
  // _img/ 에 없다는 뜻이다. 어디에 두면 되는지까지 같이 말한다 — 이름을
  // 안 대면 열어 봐야 알고, 열어 봐도 무엇이 어긋났는지는 안 보인다.
  if (!file) {
    const where = `src/content/${path.dirname(scope)}/_img/${refBasename(src)}`;
    return notice(`이미지를 불러오는데에 실패했습니다 — ${where} 에 사진을 두고 pnpm img`);
  }

  const size = fs.statSync(file).size;
  if (size > INLINE_LIMIT) {
    return notice(`${refBasename(src)} — 원본이 커서 미리보기를 건너뛴다. pnpm img`);
  }

  const mime = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const data = fs.readFileSync(file).toString('base64');

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 절대 규칙 8 */}
      <img
        src={`data:${mime};base64,${data}`}
        alt={alt}
        decoding="async"
        className={cn(FRAME, 'h-auto max-w-full', className)}
      />
      <span className="text-meta text-ink-muted -mt-4 mb-6 block font-mono">
        아직 안 올린 원본이다 (dev 에서만 보인다) — pnpm img
      </span>
    </>
  );
}
