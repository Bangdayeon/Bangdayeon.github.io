/**
 * GoatCounter 사이트 코드 — `https://<코드>.goatcounter.com` 의 그 <코드>.
 *
 * 비어 있으면 집계 스크립트를 아예 안 내보낸다. 그래서 로컬에서 글 쓰며
 * 새로고침한 것이 조회수에 섞이지 않고, 코드를 넣지 않은 채로 배포해도 아무
 * 일도 일어나지 않는다 (사이드바는 "조회수 집계 전"으로 선다).
 *
 * NEXT_PUBLIC_ 이 붙은 값은 빌드가 문자열로 박아 넣는다 — 정적 산출물에 그대로
 * 남으므로 비밀이 아닌 것만 여기 둔다. 통계를 읽어오는 API 토큰은 빌드 때만
 * 쓰이고 화면에는 나가지 않는다 (scripts/fetch-views.ts).
 */
export const GOATCOUNTER_CODE = process.env.NEXT_PUBLIC_GOATCOUNTER_CODE ?? '';
