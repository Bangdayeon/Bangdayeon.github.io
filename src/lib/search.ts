import type { Post } from '@/types/post';

/**
 * 제목 · 태그 · 요약 부분일치. 초성으로도 찾는다 — 'ㄷㅈㅇ' 이 '디자인' 을 연다.
 *
 * 픽스처 십수 개가 대상이라 훑어보기로 충분하다. 한국어 검색 라이브러리를
 * 정하면(README 미결정) 이 함수 안쪽만 갈아끼운다 — 형태소 분석이 붙어도
 * 호출부는 그대로다.
 */

/** 한글 음절의 첫 자음 19개. 음절 코드가 이 순서로 초성을 고른다. */
const LEADS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/**
 * 된소리는 shift 를 눌러야 나온다. 그래서 'ㄱ' 은 'ㄲ' 도 연다 —
 * 'ㄲㅁ' 을 못 떠올려도 'ㄱㅁ' 으로 '꿈' 에 닿는다. 반대는 없다.
 */
const TENSE: Record<string, string | undefined> = {
  ㄱ: 'ㄲ',
  ㄷ: 'ㄸ',
  ㅂ: 'ㅃ',
  ㅅ: 'ㅆ',
  ㅈ: 'ㅉ',
};

const FIRST_SYLLABLE = 0xac00; // '가'
const LAST_SYLLABLE = 0xd7a3; // '힣'
/** 중성 21 × 종성 28 — 음절 코드에서 초성 한 칸의 너비. */
const LEAD_SPAN = 588;

/** 음절이면 초성 한 글자, 아니면 빈 문자열. */
function leadOf(char: string) {
  const code = char.charCodeAt(0);
  if (code < FIRST_SYLLABLE || code > LAST_SYLLABLE) return '';
  return LEADS[Math.floor((code - FIRST_SYLLABLE) / LEAD_SPAN)];
}

/** 공백과 대소문자를 지운다. '디자인 시스템' 으로도 '디자인시스템' 을 찾게. */
function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

/**
 * 검색어 한 글자가 본문 한 글자를 여는가.
 *
 * 자음 하나는 음절의 초성으로도 쳐준다. 그래서 '디ㅈㅇ' 처럼 반만 친 것도
 * 그대로 이어진다 — 초성 전용 모드를 따로 두지 않는 이유다.
 */
function opens(queryChar: string, textChar: string) {
  if (queryChar === textChar) return true;
  if (!LEADS.includes(queryChar)) return false;

  const lead = leadOf(textChar);
  return lead !== '' && (lead === queryChar || lead === TENSE[queryChar]);
}

/** 자리를 하나씩 밀어 가며 맞춰 본다 — includes 와 같되, 한 글자 비교만 느슨하다. */
function contains(text: string, query: string) {
  for (let start = 0; start <= text.length - query.length; start += 1) {
    let i = 0;
    while (i < query.length && opens(query[i], text[start + i])) i += 1;
    if (i === query.length) return true;
  }
  return false;
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const needle = normalize(query);
  if (needle === '') return [];

  // 자음이 한 톨도 없으면 초성을 따질 일이 없다. 엔진이 직접 훑게 둔다.
  const loose = [...needle].some(char => LEADS.includes(char));

  return posts.filter(post => {
    const haystack = normalize([post.title, post.summary, ...post.tags].join(' '));
    return loose ? contains(haystack, needle) : haystack.includes(needle);
  });
}
