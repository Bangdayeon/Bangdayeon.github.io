import type { Blockquote, Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Obsidian 콜아웃을 <Callout> 로 바꾼다.
 *
 *   > [!note] 제목
 *   > 본문
 *
 * mdxJsxFlowElement 를 직접 만드는 대신 data.hName 을 쓴다 — MDX 가 mdast 를
 * hast 로 옮길 때 이 이름을 그대로 태그로 쓰므로, 컴포넌트 맵에 callout 만
 * 등록해 두면 된다. AST 노드 타입을 새로 들여올 필요가 없다.
 */

/**
 * 지원하는 네 종류. Obsidian 의 나머지 종류는 note 로 떨어진다.
 *
 * warning 은 뺐다 — danger 와 뜻이 겹치는데 화면에는 노랑/빨강 두 색으로
 * 나뉘어 있어서, 쓰는 쪽이 매번 "이건 주의인가 경고인가"를 고르게 만들었다.
 * 아래 ALIASES 가 danger 로 접어 준다.
 */
export const CALLOUT_TYPES = ['note', 'tip', 'danger', 'quote'] as const;

export type CalloutType = (typeof CALLOUT_TYPES)[number];

/** Obsidian 기본 종류 중 뜻이 겹치는 것들을 다섯 종류로 접는다. */
const ALIASES: Record<string, CalloutType> = {
  info: 'note',
  abstract: 'note',
  summary: 'note',
  todo: 'note',
  hint: 'tip',
  success: 'tip',
  check: 'tip',
  done: 'tip',
  question: 'tip',
  warning: 'danger',
  attention: 'danger',
  caution: 'danger',
  failure: 'danger',
  fail: 'danger',
  missing: 'danger',
  error: 'danger',
  bug: 'danger',
  cite: 'quote',
  example: 'note',
};

/** `[!note] 제목` · `[!note]- 제목`(접힘 표시는 무시한다) */
const MARKER = /^\[!([a-zA-Z]+)\][-+]?[ \t]*(.*)$/;

export type CalloutOptions = {
  /** 모르는 종류를 만났을 때. 빌드 로그를 남기는 쪽이 정한다. */
  onUnknown?: (type: string) => void;
};

export function remarkCallout({ onUnknown }: CalloutOptions = {}) {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const paragraph = node.children[0];
      if (paragraph?.type !== 'paragraph') return;

      const head = paragraph.children[0];
      if (head?.type !== 'text') return;

      const [firstLine, ...rest] = head.value.split('\n');
      const matched = MARKER.exec(firstLine);
      if (!matched) return;

      const raw = matched[1].toLowerCase();
      const title = matched[2].trim();

      let type: CalloutType;
      if ((CALLOUT_TYPES as readonly string[]).includes(raw)) {
        type = raw as CalloutType;
      } else if (ALIASES[raw]) {
        type = ALIASES[raw];
      } else {
        onUnknown?.(raw);
        type = 'note';
      }

      // 표식 줄만 걷어내고 나머지 본문은 그대로 둔다.
      head.value = rest.join('\n');
      if (head.value === '' && paragraph.children.length === 1) {
        node.children.shift();
      }

      node.data = {
        hName: 'callout',
        hProperties: title ? { type, title } : { type },
      };
    });
  };
}
