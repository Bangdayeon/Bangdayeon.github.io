/**
 * 하위 경로에 서는 배포의 접두사 (next.config 의 basePath 와 같은 값).
 *
 * 저장소 이름이 `<계정>.github.io` 면 사이트가 루트에 서므로 빈 문자열이고,
 * 그게 권장하는 모양이다 (docs/deploy.md). `room` 처럼 다른 이름이면 사이트가
 * `<계정>.github.io/room/` 아래에 서고 이 값이 `/room` 이 된다.
 *
 * Next 는 <Link> 의 href 와 자기가 만든 자산에는 basePath 를 알아서 붙인다.
 * 붙여 주지 않는 것은 우리가 문자열로 적은 자산 경로들이다 — 이 사이트는
 * next/image 를 쓰지 않으므로(절대 규칙 8) 사진이 전부 여기 해당한다.
 *
 * NEXT_PUBLIC_ 접두사가 붙은 이유는 클라이언트 컴포넌트도 이 값을 읽기 때문이다
 * (사이드바 프로필 사진). 주소에 이미 드러나 있는 값이라 숨길 것이 없다.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** `/profile.jpeg` → `/room/profile.jpeg`. 이미 절대 주소면 그대로 둔다. */
export function asset(url: string): string {
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${BASE_PATH}${url}`;
}
