import type { Locale } from '@/i18n.config';

/**
 * 사이트 명칭. metadata(title)와 헤더 로고 옆 제목이 같은 값을 본다.
 *
 * 언어마다 한 벌이다. locales/*.json 이 아니라 여기 있는 이유는 이게 화면의
 * UI 문구가 아니라 사이트의 이름이기 때문이다 — 번역이 비어 있을 때 다른
 * 언어로 떨어지는 i18next 의 fallbackLng 규칙이 이름에는 맞지 않는다
 * (PROFILE 도 같은 이유로 config 에 있다). 표라서 언어를 하나 늘리면 타입이
 * 빠진 칸을 잡아 준다.
 */
export const SITE_NAME: Record<Locale, string> = {
  ko: '감자의 오묘한 모험',
  en: 'POTATO THE DEVELOPER',
};

export const SITE_DESCRIPTION: Record<Locale, string> = {
  ko: "'나' 아카이브",
  en: "An archive of 'me'",
};

/**
 * 헤더에 언어 전환 버튼을 세울지.
 *
 * 한동안 false 였다. src/locales/en/common.json 이 빈 자리표시자여서, 영어를
 * 골라도 주소만 /en/… 으로 바뀌고 화면은 그대로였기 때문이다 — 눌러도 아무
 * 일이 안 일어나는 버튼이었다.
 *
 * 이제 UI 문구가 다 채워졌고 리뷰 글에도 영문판(…-slug.en.md)이 붙어서 켠다.
 * 번역이 없는 글은 여전히 한국어로 떨어진다 (i18n.config 의
 * returnEmptyString: false). 그래서 이 값이 뜻하는 것은 "영어판이 완성됐나"가
 * 아니라 "눌렀을 때 화면이 실제로 바뀌나"다.
 *
 * 라우팅은 이 값과 무관하게 살아 있다. /en/… 주소는 계속 열리고, 정적 생성도
 * 두 언어를 그대로 굽는다 (generateI18nStaticParams). 크롤러 차단은 별개다 —
 * app/robots.ts 를 함께 볼 것.
 */
export const SHOW_LANG_SWITCH: boolean = true;

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
