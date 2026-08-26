import type { Metadata } from 'next';

import { getPostsByTag, getTagCounts } from '@/lib/posts';

import { PageTitle } from '@/components/PageTitle';
import { PostList } from '@/components/PostList';

export const dynamicParams = false;

export function generateStaticParams() {
  return getTagCounts().map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

type Params = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  // config/tag-alias.ts 로 정규화된 태그가 색인에 들어 있으므로 여기서는 그대로 쓴다.
  const name = decodeURIComponent(tag);
  const posts = getPostsByTag(name);

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-10">
      <PageTitle title={name} meta={`${posts.length}편`} />

      <PostList posts={posts} emptyText="이 태그의 글이 없다." />
    </main>
  );
}
