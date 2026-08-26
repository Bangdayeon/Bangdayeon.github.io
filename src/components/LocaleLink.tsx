'use client';

import type { ComponentProps } from 'react';

import Link from 'next/link';

import { useT } from 'next-i18next/client';

import { localeHref } from '@/lib/i18n';

/**
 * 언어를 아는 <Link>.
 *
 * 라우트는 전부 app/[lng]/ 아래에 있지만 한국어 주소에는 접두사가 없다. 그래서
 * `/dev` 같은 링크를 영어 화면에서 그대로 걸면 누르는 순간 한국어로 튕긴다 —
 * 화면은 영어인데 링크만 한국어로 새는 셈이다.
 *
 * 붙이는 곳이 스무 곳 가까이라 각 화면이 자기 언어를 알아내서 붙이게 하면,
 * 나중에 링크를 하나 추가할 때마다 같은 실수를 다시 할 수 있다. 그래서 링크
 * 자체가 언어를 알게 한다 — 부르는 쪽은 예전처럼 `/dev` 만 넘기면 된다.
 *
 * 클라이언트 컴포넌트지만 페이지가 클라이언트로 넘어가지는 않는다. 서버
 * 컴포넌트 안에 이 링크만 섬처럼 들어가고, 언어는 루트 레이아웃의
 * I18nProvider 가 이미 심어 둔 값이라 서버 렌더 결과(HTML)에도 접두사가 붙어
 * 나온다. 자바스크립트가 아직 안 왔을 때 눌러도 맞는 주소로 간다.
 *
 * 바깥 링크(http…)와 페이지 안 앵커(#…)는 localeHref 가 그대로 통과시킨다.
 */
export function LocaleLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const { i18n } = useT();

  if (typeof href !== 'string' || /^[a-z]+:/i.test(href)) {
    return <Link href={href} {...rest} />;
  }

  return <Link href={localeHref(i18n.language, href)} {...rest} />;
}
