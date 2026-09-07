/**
 * 글이 하나도 없을 때 정적 내보내기를 세우는 자리표시자.
 *
 * `output: 'export'` 는 동적 구간마다 경로가 최소 하나 있기를 요구한다 —
 * generateStaticParams 가 빈 배열을 주면 빌드가 그 자리에서 멈춘다. 그런데
 * 이 저장소에서 "글이 0편"은 오류가 아니라 정상적인 한 시점이다 (처음
 * 시작했을 때, 그리고 쌓인 것을 통째로 비웠을 때). 그때 배포가 깨지면
 * 빈 사이트조차 올라가지 않는다.
 *
 * 그래서 목록이 비었을 때만 경로를 하나 끼운다. 그 경로로 굽힌 화면은
 * notFound() 로 떨어지므로 밖에서 보면 없는 주소다. 글이 하나라도 생기면
 * 진짜 목록이 나오고 이 자리표시자는 아예 만들어지지 않는다 —
 * `dynamicParams = false` 라 그 뒤로는 접근할 방법도 없다.
 *
 * 값에 밑줄을 쓴 이유: slug 와 태그 규칙이 소문자 영문 · 숫자 · 한글과
 * 하이픈만 허용하므로(lib/post-schema) 진짜 글이나 태그와 절대 겹치지 않는다.
 */
export const EMPTY_PARAM = '_empty';

/** 비어 있으면 자리표시자 하나짜리 목록으로 바꾼다. */
export function atLeastOne<T>(params: T[], placeholder: T): T[] {
  return params.length > 0 ? params : [placeholder];
}
