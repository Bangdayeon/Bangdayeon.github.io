/**
 * 사이드바 프로필.
 *
 * config/site.ts 와 나눠 둔다 — 저건 문서 제목 · 헤더가 보는 "사이트"고,
 * 이건 "쓰는 사람"이다. 나중에 /about 이 같은 값을 쓰게 되면 여기서 가져간다.
 */
export type Profile = {
  name: string;
  /**
   * 두세 줄. 사이드바 폭이 224px(w-56) 이라 네 줄을 넘기면 메뉴가 접힘선
   * 아래로 밀린다. 긴 소개는 /about 으로.
   */
  bio: string;
  /**
   * 프로필 사진. 없으면 감자 마크가 대신 들어간다.
   *
   * next/image 에 물리지 않는다 (README 규약) — R2 URL 을 그대로 넣고 <img> 로
   * 서빙한다. 원형으로 잘리므로 정사각형 원본을 쓸 것.
   */
  avatar?: { src: string; alt: string };
};

export const PROFILE: Profile = {
  name: '감자',
  bio: '읽은 것과 다녀온 것을 남깁니다. 포트폴리오는 마지막에.',
  // avatar: { src: 'https://.../me.jpg', alt: '감자 프로필 사진' },
};
