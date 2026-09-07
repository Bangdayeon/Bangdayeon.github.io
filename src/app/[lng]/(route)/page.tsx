import { getAllPosts } from '@/lib/posts';
import { serverLocale, serverT } from '@/lib/t';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { PageTitle } from '@/components/PageTitle';
import { PostList } from '@/components/PostList';

/** 홈에 세울 최신 글. 그 뒤는 아카이브가 맡는다. */
const LATEST = 10;

export default async function HomePage() {
  const { t } = await serverT();
  const posts = getAllPosts(await serverLocale());

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-10">
      <PageTitle title={t('home.title')} meta={t('home.total', { count: posts.length })} />

      <PostList posts={posts.slice(0, LATEST)} />

      {posts.length > LATEST && (
        <p className="mt-8 text-center">
          <Link
            href="/archive"
            className="text-meta text-ink hover:bg-surface-subtle border-line focus-visible:outline-focus rounded-lg border px-3 py-1.5 focus-visible:outline-2"
          >
            {t('home.viewAll')}
          </Link>
        </p>
      )}
    </main>
  );
}
