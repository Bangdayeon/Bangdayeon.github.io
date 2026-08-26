import { defineConfig } from 'next-i18next';

/**
 * 언어 설정 — proxy 와 루트 레이아웃이 같은 객체를 본다.
 *
 * 언어를 하나 더 늘릴 때 손대는 곳은 여기와 src/locales/<코드>/ 두 군데뿐이다.
 * supportedLngs 에 코드를 넣고 그 이름의 폴더에 json 을 두면 주소 · 프록시 ·
 * 정적 생성(generateI18nStaticParams)이 전부 따라온다.
 *
 * hideDefaultLocale 이 이 프로젝트에서 가장 중요한 한 줄이다 — 한국어는 주소에
 * 접두사가 없다. 이미 발행한 글의 주소는 바뀌지 않아야 하기 때문이다
 * (README 규약: 발행 후 id 고정). 라이브러리가 /ko/… 로 들어온 요청을 접두사
 * 없는 정식 주소로 되돌려 주므로 같은 글이 주소 두 개로 갈라지지도 않는다.
 */
export const LOCALES = ['ko', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

export const i18nConfig = defineConfig({
  supportedLngs: [...LOCALES],
  fallbackLng: DEFAULT_LOCALE,

  /* 네임스페이스. 화면 단위로 가르지 않고 하나로 둔다 — 이 사이트의 문구는
     전부 합쳐도 수백 줄이라, 나누면 어느 파일에 있는지 찾는 비용이 더 크다. */
  defaultNS: 'common',
  ns: ['common'],

  /** 한국어는 접두사 없이(`/dev`), 나머지는 붙여서(`/en/dev`). */
  localeInPath: true,
  hideDefaultLocale: true,

  /* 값이 빈 키는 "번역이 없는 것"으로 친다.
     en/common.json 은 아직 값이 전부 빈 자리표시자다. i18next 기본값
     (returnEmptyString: true)은 빈 문자열도 멀쩡한 번역으로 쳐서, 영어 주소에서는
     메뉴도 제목도 통째로 빈칸이 된다 — 번역이 빠졌다는 사실조차 화면에 안
     남는다. false 로 두면 fallbackLng(한국어)로 돌아가므로 채운 만큼만 영어가
     되고, 나머지는 한국어로 읽힌다. */
  i18nextOptions: {
    returnEmptyString: false,
  },

  /*
   * 문구를 public/locales 가 아니라 번들에 넣는다.
   *
   * public/ 에 두면 브라우저가 json 을 따로 받아 가는데, 이 사이트는 문구까지
   * 포함해 통째로 정적으로 굽히는 쪽이 맞다 — 요청이 하나 줄고, 번역이 빠진
   * 키를 빌드가 잡아낸다.
   */
  resourceLoader: (language, namespace) =>
    import(`./locales/${language}/${namespace}.json`).then(module => module.default),

  /* dev 에서 json 을 고치면 새로고침만으로 반영된다 (프로덕션에는 영향 없음).
     콘텐츠(MDX)가 이미 그렇게 도는데 문구만 재시작이 필요하면 어긋난다. */
  reloadOnPrerender: true,
});
