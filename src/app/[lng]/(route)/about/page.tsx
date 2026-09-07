import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadPage } from '@/lib/content/source';
import { serverLocale, serverT } from '@/lib/t';

import { MdxContent } from '@/components/MdxContent';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverT();
  return { title: t('about.title') };
}

export default async function AboutPage() {
  const { t } = await serverT();

  // 글이 아니라 고정 페이지다 — 색인에도, 그래프에도 들어가지 않는다.
  const source = loadPage('about', await serverLocale());
  if (source === null) notFound();

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-10">
      <h1 className="text-title-lg text-ink-strong mb-6">{t('about.title')}</h1>
      <MdxContent source={source} scope="page/about" />
    </main>
  );
}
