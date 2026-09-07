import type { Metadata } from 'next';

import { getTagCounts } from '@/lib/posts';
import { serverLocale, serverT } from '@/lib/t';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { PageTitle } from '@/components/PageTitle';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverT();
  return { title: t('tags.title') };
}

/**
 * 태그 목록.
 *
 * 칩은 전부 같은 크기다. 예전에는 글이 많은 태그일수록 글자를 키웠는데,
 * 크기 토큰에 굵기가 딸려 있어서(text-title-sm 은 600) 1등 태그 하나만
 * 굵어 보였다 — 정도의 차이로 읽히지 않고 "저것만 다른 것"으로 읽힌다.
 * 얼마나 많은지는 칩 안의 수가 이미 말하고 있고, 목록은 어차피 많은 순이다.
 */
export default async function TagsPage() {
  const { t } = await serverT();
  const tags = getTagCounts(await serverLocale());

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-10">
      <PageTitle title={t('tags.title')} meta={t('tags.kinds', { count: tags.length })} />

      {tags.length === 0 ? (
        <p className="text-body text-ink-muted py-16 text-center">{t('tags.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              {/* 아카이브의 연도 칩과 같은 모양이다 — 둘 다 "누르면 걸러진
                  목록으로 가는 이름 + 수"라서 생김새가 갈리면 안 된다. */}
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className="text-meta text-ink border-line hover:border-primary hover:bg-primary-subtle hover:text-primary-ink focus-visible:outline-focus inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 transition-colors focus-visible:outline-2"
              >
                {tag}
                <span className="text-meta-sm text-ink-muted tabular-nums">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
