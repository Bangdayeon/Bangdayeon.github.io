import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/cn';
import { remarkCallout } from '@/lib/mdx/remark-callout';
import { remarkWikilink } from '@/lib/mdx/remark-wikilink';
import type { LinkTarget } from '@/lib/mdx/wikilink';
import { getAllPosts } from '@/lib/posts';
import { serverLocale } from '@/lib/t';

import { Callout } from '@/components/Callout';
import { Img } from '@/components/Img';
import { LocaleLink } from '@/components/LocaleLink';

/**
 * MDX 본문 렌더.
 *
 * 번들러(@next/mdx)가 아니라 여기서 컴파일한다. Turbopack 은 remark 플러그인을
 * 문자열로만 받고 JS 함수를 못 넘기는데(Next 문서 mdx.md), 위키링크 · 콜아웃은
 * 이 저장소 안에 있는 자작 플러그인이라 문자열로 지목할 수가 없다.
 *
 * 태그별 클래스는 전부 기존 타이포 · 색 토큰이다. 본문에서 처음 보는 크기나
 * 색이 나오면 그건 토큰이 부족하다는 신호지 여기서 값을 적을 이유가 아니다.
 */

/**
 * 링크 뒤에 붙는 표시.
 *
 * 밑줄을 걷어낸 자리를 대신한다 — 색만으로 링크를 알리면 색을 못 보는 사람에게는
 * 링크가 사라지므로, 색이 아닌 표시가 하나는 있어야 한다.
 *
 * 크기를 px 가 아니라 em 으로 잡아 글자 크기를 따라간다. 본문(18px)과 콜아웃
 * (15px)에서 같은 비율로 보인다.
 */
/**
 * 이 사이트 밖으로 나가는 링크인가.
 *
 * 내부 링크는 위키링크가 만든 /category/slug 이거나 손으로 적은 앵커뿐이라
 * 프로토콜 목록(http · mailto …)을 열거하는 대신 이 둘만 안쪽으로 본다.
 */
function isExternal(href: string | undefined) {
  return !!href && !href.startsWith('/') && !href.startsWith('#');
}

function LinkMark({ external }: { external: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-0.5 inline-block size-[0.8em] shrink-0 align-[0.02em] opacity-70"
    >
      {external ? (
        // 바깥 사이트 — 나가는 화살표
        <path d="M6.5 3.5H12.5V9.5M12.5 3.5 4 12" />
      ) : (
        // 이 블로그의 다른 글 — 고리 두 개
        <path d="M6.6 9.4a2.7 2.7 0 0 0 4 .3l1.9-1.9a2.7 2.7 0 0 0-3.8-3.8l-1 1M9.4 6.6a2.7 2.7 0 0 0-4-.3L3.5 8.2a2.7 2.7 0 0 0 3.8 3.8l1-1" />
      )}
    </svg>
  );
}

const BASE_COMPONENTS = {
  callout: Callout,

  h2: (props: React.ComponentProps<'h2'>) => (
    <h2 {...props} className="text-title-md text-ink-strong mt-10 mb-3" />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3 {...props} className="text-title-sm text-ink-strong mt-8 mb-2" />
  ),
  h4: (props: React.ComponentProps<'h4'>) => (
    <h4 {...props} className="text-label text-ink-strong mt-6 mb-2" />
  ),

  p: (props: React.ComponentProps<'p'>) => <p {...props} className="text-body-lg my-5" />,

  a: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    // 밑줄 대신 "본문보다 연한 글씨 + 뒤에 붙는 표시". 밑줄은 글줄이 많은
    // 화면에서 줄마다 걸려 보이고, 한글은 밑줄이 받침에 닿는다.
    // 진해지는 쪽이 아니라 연해지는 쪽으로 구분하되, 가리키면 본문색까지
    // 올라오고 밑줄이 돌아온다.
    // 본문의 위키링크는 /dev/… 같은 내부 주소로 풀린다. LocaleLink 를 태워야
    // 영어 화면에서 글을 읽다가 이어 읽기를 눌렀을 때 한국어로 새지 않는다.
    // 바깥 링크는 LocaleLink 가 스킴을 보고 그대로 통과시킨다.
    <LocaleLink
      {...props}
      href={href ?? '#'}
      className={cn(
        'text-ink-muted hover:text-ink rounded-xs transition-colors',
        'decoration-primary hover:underline hover:underline-offset-4',
        'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2'
      )}
    >
      {children}
      <LinkMark external={isExternal(href)} />
    </LocaleLink>
  ),

  ul: (props: React.ComponentProps<'ul'>) => (
    <ul {...props} className="text-body-lg my-5 list-disc space-y-1 pl-5" />
  ),
  ol: (props: React.ComponentProps<'ol'>) => (
    <ol {...props} className="text-body-lg my-5 list-decimal space-y-1 pl-5" />
  ),

  blockquote: (props: React.ComponentProps<'blockquote'>) => (
    <blockquote {...props} className="border-line-strong text-ink-muted my-6 border-l-2 pl-4" />
  ),

  hr: () => <hr className="border-line my-10" />,

  // 인라인 코드는 밝은 채로 둔다 — 문장 한가운데를 검게 칠하면 글줄이 끊긴다.
  code: (props: React.ComponentProps<'code'>) => (
    <code
      {...props}
      className="text-code bg-surface-muted border-line-subtle rounded border px-1 py-0.5 font-mono break-words"
    />
  ),

  /**
   * 코드블록. 라이트 · 다크 어느 쪽에서나 어둡다 (colors.css 의 code 토큰).
   *
   * 들여쓰기는 <pre> 가 원문 그대로 보존한다. 탭은 브라우저 기본값이 8칸이라
   * 스페이스 2칸과 섞이면 계단이 어긋나므로 2로 맞춘다.
   *
   * 안쪽 <code> 는 인라인용 배경 · 테두리를 벗기고 색만 물려받는다.
   */
  pre: (props: React.ComponentProps<'pre'>) => (
    <pre
      {...props}
      className={cn(
        'text-code bg-code-surface text-code-ink border-code-line my-6 overflow-x-auto rounded-lg border p-4 font-mono [tab-size:2]',
        '[&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit'
      )}
    />
  ),

  table: (props: React.ComponentProps<'table'>) => (
    <div className="my-6 overflow-x-auto">
      <table {...props} className="text-body-sm w-full border-collapse" />
    </div>
  ),
  th: (props: React.ComponentProps<'th'>) => (
    <th {...props} className="border-line text-ink-strong border-b px-3 py-2 text-left" />
  ),
  td: (props: React.ComponentProps<'td'>) => (
    <td {...props} className="border-line-subtle border-b px-3 py-2" />
  ),

  // img 는 여기 없다 — 어느 글에 실렸는지(scope)를 알아야 표를 짚을 수 있어서
  // 렌더할 때 붙인다. 아래 MdxContent 를 볼 것.
};

export async function MdxContent({
  source,
  scope,
  className,
}: {
  source: string;
  /**
   * 이 본문이 실린 글의 id (고정 페이지는 `page/about`).
   *
   * 이미지 표의 열쇠 앞자리다. 부르는 쪽이 반드시 적게 한 이유는, 빠뜨리면
   * 그림이 조용히 안 나오는 게 아니라 다른 글의 그림이 나올 수도 있기 때문이다.
   */
  scope: string;
  className?: string;
}) {
  // 위키링크를 풀려면 전체 글 목록이 필요하다. 파일명은 규약대로 조립한다.
  // 지금 언어로 세운 목록이라, 링크에 붙는 제목도 읽고 있는 언어를 따라간다.
  const targets: LinkTarget[] = getAllPosts(await serverLocale()).map(post => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    file: `${post.date}-${post.slug}`,
  }));

  const { content } = await compileMDX({
    source,
    components: {
      ...BASE_COMPONENTS,
      // src 는 React 타입상 Blob 도 될 수 있지만(<img src={File}>), MDX 가 넘기는
      // 것은 언제나 본문에 적힌 문자열이다.
      img: ({ src, alt }: React.ComponentProps<'img'>) => (
        <Img src={typeof src === 'string' ? src : undefined} alt={alt} scope={scope} />
      ),
    },
    options: {
      mdxOptions: {
        // unified 는 [플러그인, 옵션] 을 받아 자기가 호출한다. 미리 호출해서
        // 넘기면 트랜스포머가 플러그인 자리에 앉아 tree 대신 옵션을 받는다.
        remarkPlugins: [
          remarkGfm,
          [
            remarkCallout,
            {
              onUnknown: (type: string) =>
                console.warn(`[mdx] 모르는 콜아웃 종류 [!${type}] — note 로 그린다`),
            },
          ],
          [
            remarkWikilink,
            {
              posts: targets,
              onMissing: (target: string) =>
                console.warn(`[mdx] 위키링크가 가리키는 글이 없다: [[${target}]]`),
            },
          ],
        ],
      },
    },
  });

  return <div className={cn('text-ink', className)}>{content}</div>;
}
