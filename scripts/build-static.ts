import { spawnSync } from 'node:child_process';

/**
 * GitHub Pages 에 올릴 산출물을 만든다 — `next build` 를 내보내기 모드로 돌리고,
 * 이어서 out/ 을 서버 없는 곳에 맞게 고친다 (scripts/export-fixup.ts).
 *
 * 환경변수를 package.json 의 스크립트 줄에서 앞에 붙이지 않는 이유는 윈도우다.
 * `NEXT_EXPORT=1 next build` 는 cmd.exe 에서 그대로 실패한다 — 개발은 윈도우,
 * 배포는 리눅스라 어느 한쪽에서만 도는 줄을 두면 언젠가 그쪽에서 막힌다.
 *
 * 서버가 있는 곳(Cloudflare Workers 등)으로 옮길 때는 이 스크립트를 거치지 않고
 * `pnpm build:server` 를 쓰면 된다. 그러면 proxy 와 308 리다이렉트가 그대로
 * 살아난다 — 정적 내보내기 때문에 포기한 것이 그 둘뿐이라, 되돌리는 자리도
 * 그 한 줄이다.
 */

/**
 * 인자를 배열로 나누지 않고 한 줄로 넘긴다 — shell 을 쓰면서 인자를 따로 주면
 * node 가 이스케이프 경고를 낸다. 여기 들어오는 명령은 아래 두 줄로 고정이라
 * 바깥에서 들어온 문자열이 섞일 자리가 없다.
 */
function run(command: string, env?: Record<string, string>) {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('next build', { NEXT_EXPORT: '1' });
run('tsx scripts/export-fixup.ts');
