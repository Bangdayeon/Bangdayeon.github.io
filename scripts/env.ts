import fs from 'node:fs';
import path from 'node:path';

/**
 * .env.local 을 process.env 에 채운다.
 *
 * Next 는 앱을 돌릴 때 알아서 읽지만 스크립트(tsx)는 아무것도 읽지 않는다.
 * dotenv 를 넣는 대신 여기서 읽는다 — 우리가 쓰는 건 `KEY=value` 한 줄짜리
 * 뿐이고, 따옴표와 주석만 벗기면 끝이라 라이브러리를 하나 더 얹을 일이 아니다.
 *
 * 이미 있는 값은 덮지 않는다. 배포(Vercel)에는 .env.local 이 없고 대시보드가
 * 넣어 준 process.env 만 있으므로, 파일이 없으면 아무 일도 하지 않는다.
 */
export function loadEnvLocal(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const matched = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!matched) continue;

    const [, key, rawValue] = matched;
    if (process.env[key] !== undefined) continue;

    const value = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
    process.env[key] = value;
  }
}
