import type { Metadata } from 'next';

import { I18nProvider } from 'next-i18next/client';
import {
  generateI18nStaticParams,
  getResources,
  getT,
  initServerI18next,
} from 'next-i18next/server';

import { SITE_DESCRIPTION, SITE_NAME } from '@/config/site';

import { Analytics } from '@/components/Analytics';
import { PrefsBoot } from '@/components/PrefsBoot';

import '@/styles/globals.css';

import { i18nConfig } from '@/i18n.config';

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

/**
 * 두 언어를 모두 미리 굽는다. 쿠키로 언어를 정하지 않는 이유가 이것이다 —
 * 요청마다 언어를 물어보면 모든 페이지가 동적 렌더링이 되고, 이 사이트가
 * 서 있는 "정적 산출물" 전제가 무너진다.
 *
 * 목록은 i18n.config 의 supportedLngs 에서 나온다. 언어를 늘릴 때 여기를
 * 고칠 일은 없다.
 */
export function generateStaticParams() {
  return generateI18nStaticParams();
}

initServerI18next(i18nConfig);

/**
 * 루트 레이아웃.
 *
 * [lng] 가 루트 레이아웃보다 위에 있어서 root parameter 가 된다 — 서버
 * 컴포넌트는 어디서든 getT() 한 줄로 문구를 얻고, prop 으로 언어를 내려보내지
 * 않는다. 클라이언트 컴포넌트는 아래 I18nProvider 가 심어 주는 인스턴스를
 * useT() 로 쓴다.
 *
 * getResources 로 서버가 이미 읽은 문구를 그대로 넘긴다. 안 넘기면 클라이언트가
 * json 을 다시 받아 오고, 그 사이 한 프레임 동안 키가 그대로 비친다.
 */
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  // 언어를 params 에서 직접 받아 getT 에 넘긴다. 인자 없이 부르면 getT 가
  // 요청 헤더(x-i18next-current-language)를 읽어 언어를 알아내는데, 헤더를
  // 건드리는 순간 이 레이아웃 아래 모든 페이지가 "요청이 와야 알 수 있는 것"
  // 으로 분류돼 정적 생성에서 빠진다. 주소에 이미 언어가 있으므로 물어볼
  // 이유가 없다.
  const { lng } = await params;
  const { i18n } = await getT(undefined, { lng });
  const resources = getResources(i18n, i18nConfig.ns, [lng, i18nConfig.fallbackLng]);

  return (
    // 아래 인라인 스크립트가 하이드레이션 전에 테마 class 를 건드린다.
    // suppressHydrationWarning 이 없으면 React 가 이걸 불일치로 보고 되돌린다.
    // lang 은 이제 스크립트가 아니라 서버가 정한다 — 주소가 곧 언어다.
    <html lang={lng} suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 동기 실행 — 저장된 테마를 되살린다. 여기 말고는
            깜빡임 없이 복원할 자리가 없다 (Next 공식 가이드
            preventing-flash-before-hydration 과 같은 방식). 언어 전환은 이
            레이아웃을 소프트 내비게이션으로 다시 렌더하므로 script 를 그대로
            두면 실행되지 않는 script 가 다시 생긴다 — PrefsBoot 가 그 자리를
            맡는다. */}
        <PrefsBoot />
      </head>
      <body>
        {/* 조회수 집계. 코드가 없으면 아무것도 안 한다 — 로컬 새로고침이
            숫자에 섞이지 않는다. */}
        <Analytics />

        <I18nProvider
          language={lng}
          resources={resources}
          supportedLngs={i18nConfig.supportedLngs}
          defaultNS={i18nConfig.defaultNS}
          fallbackLng={i18nConfig.fallbackLng}
          // 서버 인스턴스는 initServerI18next 로 이미 이 옵션들을 받았다.
          // 클라이언트 인스턴스는 여기서 넘기지 않으면 못 받는다 — 그러면 같은
          // 키가 서버 렌더와 하이드레이션 후에 다르게 나온다 (returnEmptyString).
          i18nextOptions={i18nConfig.i18nextOptions}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
