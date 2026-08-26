import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadPage } from '@/lib/content/source';

import { MdxContent } from '@/components/MdxContent';

export const metadata: Metadata = { title: '소개' };

export default function AboutPage() {
  // 글이 아니라 고정 페이지다 — 색인에도, 그래프에도 들어가지 않는다.
  const source = loadPage('about');
  if (source === null) notFound();

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-10">
      <h1 className="text-title-lg text-ink-strong mb-6">소개</h1>
      <MdxContent source={source} />
    </main>
  );
}
