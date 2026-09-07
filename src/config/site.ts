/** 사이트 명칭. metadata(title)와 헤더 로고 옆 제목이 같은 값을 본다. */
export const SITE_NAME = '감자의 오묘한 모험';

export const SITE_DESCRIPTION = "'나' 아카이브";

/**
 * 헤더에 언어 전환 버튼을 세울지.
 *
 * 지금 src/locales/en/common.json 이 전부 빈 자리표시자다. i18n.config 의
 * returnEmptyString: false 덕에 빈 키는 한국어로 떨어지므로, 영어를 골라도
 * 주소만 /en/… 으로 바뀌고 화면은 그대로다 — 눌러도 아무 일이 안 일어나는
 * 버튼이 된다. 번역을 채우면 true 로 되돌린다.
 *
 * 끄는 것은 버튼뿐이고 라우팅은 살아 있다. /en/… 주소는 계속 열리고,
 * 정적 생성도 두 언어를 그대로 굽는다 (generateI18nStaticParams).
 * 대신 크롤러에게는 보이지 않게 막아 둔다 — app/robots.ts.
 */
export const SHOW_LANG_SWITCH: boolean = false;

/**
 * 사이트의 절대 주소 — sitemap · robots 가 쓴다. 끝에 슬래시 없이.
 *
 * 검색엔진에 내보내는 주소는 상대 경로로 적을 수 없다. 그래서 이 값만은
 * 빌드할 때 실제 배포처를 알아야 하고, CI 가 저장소 변수로 넣어 준다
 * (.github/workflows/deploy.yml).
 *
 * 비어 있으면 GitHub Pages 기본 주소로 떨어진다 — 저장소 이름이
 * <계정>.github.io 라 루트에 서고, 이 주소는 도메인을 붙이기 전까지 정본이다.
 * 나중에 도메인을 사면 저장소 변수만 바꾸면 된다 (README 미결정: 도메인).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://bangdayeon.github.io'
).replace(/\/+$/, '');

/**
 * 절대 URL 하나. `path` 는 `/` 로 시작하고, 홈은 `/` 를 넘긴다.
 *
 * 하위 경로에 서는 경우(user.github.io/room)의 접두사를 여기서 끼운다 —
 * next.config 의 basePath 와 같은 값이다. Next 가 링크에는 알아서 붙여
 * 주지만 sitemap 이 적는 문자열에는 붙여 주지 않는다.
 */
export function absoluteUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${SITE_URL}${basePath}${path === '/' ? '' : path}`;
}
