'use client';

import { useT } from 'next-i18next/client';

import { useLocale } from '@/lib/use-locale';

import type { Locale } from '@/i18n.config';

/**
 * 화면 언어와 다른 언어로 쓰인 글에 붙는 표시.
 *
 * 번역이 없는 글은 영어 화면에도 원문 그대로 선다 (content/source.ts 의
 * pickLocale). 그게 아무 표시 없이 섞이면 "영어 사이트인데 왜 한국어 글이
 * 있지"가 되고, 반대로 빼 버리면 목록이 텅 빈다. 그래서 세우되 표시한다.
 *
 * 글자는 언어 코드 두 글자다 — 번역할 것이 없고, 어느 언어 화면에서 보든 같은
 * 뜻으로 읽힌다. 무슨 뜻인지는 옆의 sr-only 문구와 title 이 말한다.
 */
export function LocaleBadge({ locale }: { locale: Locale }) {
  const { t } = useT();
  const current = useLocale();

  if (locale === current) return null;

  const label = t('post.notTranslated');

  return (
    <span
      title={label}
      className="text-meta-sm text-ink-muted bg-surface-muted shrink-0 rounded px-1.5 py-0.5"
    >
      <span aria-hidden="true">{locale.toUpperCase()}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
