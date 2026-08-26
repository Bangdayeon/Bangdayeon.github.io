import type { CategoryNode } from '@/types/post';

import { getCategoryTree } from '@/lib/posts';

/**
 * 좌측 네비 트리.
 *
 * 카테고리 쪽은 손으로 적지 않는다 — src/content 의 폴더 모양이 그대로 메뉴가
 * 된다. 하위 카테고리를 만들고 싶으면 카테고리 폴더 안에 폴더를 하나 더 파고
 * 글을 넣으면 되고, 이 파일은 고칠 필요가 없다.
 *
 * 고정 항목(홈 · 태그 · 아카이브 · 소개)만 여기 남는다. 깊이 제한은 없다 —
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
  /** 이름 옆에 (n) 으로 붙는 글 수. 카테고리만 갖는다. */
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
    // 그 폴더에 직접 든 글 수다. 눌렀을 때 나오는 목록과 같은 기준이라,
    // 하위에만 글이 있는 중간 카테고리는 (0) 으로 선다.
    count: node.count,
    children: node.children.length > 0 ? node.children.map(toNavNode) : undefined,
  };
}

export function buildNav(): NavNode[] {
  return [
    { label: '홈', href: '/' },

    ...getCategoryTree().map(toNavNode),

    { label: '태그', href: '/tags', muted: true },
    { label: '아카이브', href: '/archive', muted: true },
    { label: '소개', href: '/about', muted: true },
  ];
}
