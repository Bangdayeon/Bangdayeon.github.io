import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPostsByTag, getTagCounts } from '@/lib/posts';
import { EMPTY_PARAM, atLeastOne } from '@/lib/static-params';
import { serverLocale, serverT } from '@/lib/t';

import { PageTitle } from '@/components/PageTitle';
import { PostList } from '@/components/PostList';
import { T } from '@/components/T';

export const dynamicParams = false;

// [lng] 는 루트 파라미터라 여기서도 serverLocale() 로 바로 읽는다 — 언어마다
// 태그 목록이 다르므로(번역이 없는 글은 원문 언어에만 있다) 언어별로 돈다.
export async function generateStaticParams() {
  // 태그를 적힌 그대로 돌려준다. 여기서 encodeURIComponent 를 걸면 한글 태그가
  // 두 곳에서 어긋난다 — 라우터는 주소에서 푼 값(회고)과 맞춰 보므로 dev 에서
  // 404 가 나고, 정적 내보내기에서는 인코딩된 문자열이 그대로 제목이 된다.
  // 주소에 넣을 때 Next 가 알아서 인코딩한다.
  // 태그가 하나도 없으면(글 0편) 자리표시자 하나 — 아래에서 404 로 떨어진다.
  return atLeastOne(
    getTagCounts(await serverLocale()).map(({ tag }) => ({ tag })),
    {
      tag: EMPTY_PARAM,
    }
  );
}

type Params = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: Params) {
  const { t } = await serverT();
  const { tag } = await params;
  // config/tag-alias.ts 로 정규화된 태그가 색인에 들어 있으므로 여기서는 그대로 쓴다.
  const name = decodeURIComponent(tag);
  if (name === EMPTY_PARAM) notFound();

  const posts = getPostsByTag(await serverLocale(), name);

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-10 sm:px-6">
      <PageTitle title={name} meta={t('tags.count', { count: posts.length })} />

      <PostList posts={posts} emptyText={<T k="tags.postsEmpty" />} />
    </main>
  );
}
