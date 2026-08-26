import { getAllPosts } from '@/lib/posts';

import { LocaleLink as Link } from '@/components/LocaleLink';
import { PageTitle } from '@/components/PageTitle';
import { PostList } from '@/components/PostList';

/** 홈에 세울 최신 글. 그 뒤는 아카이브가 맡는다. */
const LATEST = 10;

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-[820px] px-6 py-10">
      <PageTitle title="최근 글" meta={`전체 ${posts.length}편`} />

      <PostList posts={posts.slice(0, LATEST)} />

      {posts.length > LATEST && (
        <p className="mt-8 text-center">
          <Link
            href="/archive"
            className="text-meta text-ink hover:bg-surface-subtle border-line focus-visible:outline-focus rounded-lg border px-3 py-1.5 focus-visible:outline-2"
          >
            전체 보기
          </Link>
        </p>
      )}
    </main>
  );
}
