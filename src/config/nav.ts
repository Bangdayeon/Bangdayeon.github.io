import type { CategoryNode } from '@/types/post';

import { getCategoryTree, getTagCounts } from '@/lib/posts';
import { serverLocale, serverT } from '@/lib/t';

import type { Locale } from '@/i18n.config';

/**
 * 좌측 네비 트리.
 *
 * 카테고리 쪽은 손으로 적지 않는다 — src/content 의 폴더 모양이 그대로 메뉴가
 * 된다. 하위 카테고리를 만들고 싶으면 카테고리 폴더 안에 폴더를 하나 더 파고
 * 글을 넣으면 되고, 이 파일은 고칠 필요가 없다.
 *
 * 고정 항목(홈 · 아카이브 · 태그)만 여기 남는다. 그중 태그는 자식을 갖는다
 * (많이 쓴 열 개 — tagsNode). 깊이 제한은 없다 —
 * 어느 노드에든 children 이 있으면 <Sidebar> 가 들여쓰기 · 펼침 토글 · 활성
 * 전파를 그대로 처리한다.
 *
 * 글 수를 세려면 콘텐츠를 읽어야 하므로 이 함수는 서버에서만 돈다. 결과는
 * (route)/layout 이 <Sidebar> 로 내려보낸다 (Sidebar 는 클라이언트다).
 */
export type NavNode = {
  /** 표시 이름. 카테고리는 대문자 영문 (브리프 7장). */
  label: string;
  href: string;
  /** 이름 옆에 (n) 으로 붙는 글 수. 카테고리와 태그가 갖는다. */
  count?: number;
  /** 연한 글씨로 한 단 낮춰 보이게 한다 — 카테고리가 아닌 보조 메뉴. */
  muted?: boolean;
  /** 활성 자손이 없어도 처음부터 펼쳐 둘지. */
  defaultOpen?: boolean;
  children?: NavNode[];
};

function toNavNode(node: CategoryNode): NavNode {
  return {
    label: node.label,
    href: node.href,
    // 그 폴더 아래 글을 전부 센 수다 (하위 카테고리 것까지). 눌렀을 때 나오는
    // 목록과 같은 기준이라, 하위에만 글이 있는 카테고리도 제 수로 선다.
    count: node.count,
    children: node.children.length > 0 ? node.children.map(toNavNode) : undefined,
  };
}

/**
 * 메뉴는 언어를 타므로 서버에서 await 로 만든다.
 *
 * 카테고리 라벨은 getCategoryTree 가 이미 그 언어로 붙여서 준다 (CategoryNode.label).
 * 고정 항목만 여기서 t() 로 읽는다.
 */
export async function buildNav(): Promise<NavNode[]> {
  const { t } = await serverT();
  const locale = await serverLocale();

  return [
    { label: t('nav.home'), href: '/' },

    ...getCategoryTree(locale).map(toNavNode),

    { label: t('nav.archive'), href: '/archive', muted: true },
    tagsNode(locale, t('nav.tags')),
  ];
}

/**
 * 좌측 네비에 세울 태그 수.
 *
 * 태그는 늘기만 하는 목록이라 전부 세우면 네비가 카테고리보다 길어진다.
 * 많이 쓴 것부터 열 개만 두고 나머지는 /tags 가 맡는다 — 그 화면이 이미
 * 전부를 세고 있다.
 */
const NAV_TAGS = 10;

/**
 * 태그 가지 — 많이 쓴 태그 열 개.
 *
 * 아카이브보다 아래에 선다. 카테고리가 글이 든 폴더라면 태그는 그것을
 * 가로지르는 길이라, 고정 항목 중에서도 마지막이 맞다.
 *
 * 처음부터 펼쳐 둔다. 접으면 어떤 태그가 있는지가 클릭 한 번 뒤로 숨는데,
 * 이 사이트에서 태그는 카테고리 다음으로 글을 찾는 길이다. 접는 것은
 * 여전히 할 수 있다 (Sidebar 의 토글).
 *
 * 순서는 getTagCounts 가 정한다 — 많은 순, 같으면 이름순이다.
 *
 * 주소는 화면 쪽과 같은 규칙으로 만든다 (tags/page.tsx · PostView 도
 * encodeURIComponent 를 쓴다). 여기서만 어긋나면 한글 태그에서 활성 표시가
 * 안 잡힌다.
 */
function tagsNode(locale: Locale, label: string): NavNode {
  const tags = getTagCounts(locale).slice(0, NAV_TAGS);

  return {
    label,
    href: '/tags',
    muted: true,
    defaultOpen: true,
    // 태그가 하나도 없으면 children 자체를 두지 않는다 — 빈 목록을 주면
    // 펼칠 것이 없는 자리에 토글 버튼만 선다.
    children:
      tags.length > 0
        ? tags.map(({ tag, count }) => ({
            label: tag,
            href: `/tags/${encodeURIComponent(tag)}`,
            count,
            // 부모가 연한 글씨인데 자식만 진하면 자식이 더 위로 읽힌다.
            muted: true,
          }))
        : undefined,
  };
}
