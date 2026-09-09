import { getAllPosts } from '@/lib/posts';
import { serverLocale, serverT } from '@/lib/t';

import { PageTitle } from '@/components/PageTitle';
import { PostListMore } from '@/components/PostListMore';

/** 홈에 처음 세울 글, 그리고 더보기 한 번에 늘어나는 수. */
const STEP = 10;

export default async function HomePage() {
  const { t } = await serverT();
  const posts = getAllPosts(await serverLocale());

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-10 sm:px-6">
      <PageTitle title={t('home.title')} meta={t('home.total', { count: posts.length })} />

      <PostListMore posts={posts} step={STEP} />
    </main>
  );
}
