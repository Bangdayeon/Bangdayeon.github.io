import { livePostIds, syncRedirects } from './redirects';

/**
 * 리다이렉트 표만 맞춘다 (`pnpm redirects`, 그리고 커밋 훅).
 *
 * `pnpm index` 도 같은 일을 하지만 그쪽은 색인까지 굽는다. 커밋 때마다 돌 것은
 * 가벼워야 하고, src/data 는 gitignore 라 커밋에 담기지도 않는다 — 그래서
 * 표를 고치는 부분만 떼어 여기서 부른다.
 *
 * 표를 실제로 고쳤을 때만 종료 코드 10 을 낸다. 훅이 그때만 git add 하면
 * 되므로, 아무것도 안 바뀐 커밋에 파일이 딸려 들어가지 않는다.
 */
const changed = syncRedirects(livePostIds());

process.exit(changed ? 10 : 0);
