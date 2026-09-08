import { BASE_PATH } from '@/lib/base-path';

/**
 * 표에 적힌 사진 한 줄과, 그것을 화면이 받아 갈 주소.
 *
 * images.ts 에서 이 둘만 떼어 왔다. 그쪽은 node:fs 로 vault 를 뒤지고
 * config/images.json 을 통째로 안고 있어서 클라이언트가 못 부른다 — 그런데
 * 목록(<PostList>)은 검색 화면에서 클라이언트로도 그려지고, 썸네일 주소를
 * 만들려면 이 함수가 필요하다. 표도 fs 도 안 딸려 오는 조각으로 갈라 둔다.
 */

export type ImageEntry = {
  /**
   * R2 오브젝트 키. 이름 뒤에 원본 내용의 해시가 붙는다.
   *
   * 내용이 바뀌면 키가 바뀌므로 CDN 캐시를 비울 일이 없다 (immutable 로
   * 올린다). 같은 사진을 두 글에서 쓰면 키가 같아 오브젝트도 하나다.
   */
  key: string;
  /** 실제로 올라간 크기. width/height 를 박아야 이미지가 뜰 때 글이 안 밀린다. */
  w: number;
  h: number;
  /** 대표색 `#rrggbb`. 내려받기 전 그 자리를 채운다 (blur 대신 — 표가 가볍다). */
  c: string;
};

/**
 * 표에 적힌 것을 화면이 받아 갈 주소로.
 *
 * 사진이 어디 있느냐는 환경변수 하나가 정한다.
 *
 *   NEXT_PUBLIC_IMAGE_BASE_URL 있음  R2 (커스텀 도메인에서 직접 서빙)
 *   없음                             이 사이트의 public/ (GitHub Pages 가 서빙)
 *
 * 키는 원본 내용의 해시라 어느 쪽에서나 같다. 그래서 R2 로 옮기는 일이 이
 * 변수를 채우고 `pnpm img` 를 한 번 돌리는 것으로 끝나고, 화면 코드는 이
 * 함수까지 포함해 한 줄도 안 바뀐다.
 *
 * 하위 경로에 서는 배포(user.github.io/room)에서는 접두사가 붙는다. next/image
 * 를 안 쓰므로 basePath 를 Next 가 대신 붙여 주지 않는다 — 여기서 붙인다.
 */
export function imageUrl(entry: ImageEntry): string {
  const remote = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, '');
  if (remote) return `${remote}/${entry.key}`;

  return `${BASE_PATH}/${entry.key}`;
}

/**
 * 목록 왼쪽에 걸 사진. 두 갈래다.
 *
 *   표에 있는 사진   `pnpm img` 로 구워 올린 것. 크기와 대표색까지 안다 —
 *                    자리를 미리 잡아 두므로 사진이 뜰 때 목록이 안 밀린다.
 *   밖에 걸린 주소   본문에 `![](https://…/x.webp)` 로 적은 것. 주소만 안다.
 *
 * 둘을 한 타입으로 합치지 않는 이유는 아는 것의 양이 다르기 때문이다. 크기를
 * 0 이나 빈 값으로 채워 넘기면 화면이 그걸 진짜 크기로 믿는다.
 */
export type Thumb = ImageEntry | { src: string };

export function thumbSrc(thumb: Thumb): string {
  return 'key' in thumb ? imageUrl(thumb) : thumb.src;
}

/** 크기 · 대표색을 아는 쪽인지. 아니면 폭만 정하고 비율은 브라우저에 맡긴다. */
export function thumbEntry(thumb: Thumb): ImageEntry | null {
  return 'key' in thumb ? thumb : null;
}
