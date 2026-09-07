import fs from 'node:fs';
import path from 'node:path';
import 'server-only';

/**
 * 사이트 전체 조회수 — 빌드 때 구워 둔 값 (scripts/fetch-views.ts).
 *
 * 없을 수 있는 파일이다. import 로 읽으면 없을 때 빌드가 통째로 깨지므로
 * 파일로 읽고 실패는 null 로 돌려준다 — 집계 설정이 아직 없는 상태가 정상이고
 * (로컬 빌드에는 토큰이 없다), 그때 사이드바는 "조회수 집계 전"으로 선다.
 */

const VIEWS_FILE = path.join(process.cwd(), 'src', 'data', 'views.json');

export function getTotalViews(): number | null {
  try {
    const { total } = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf8')) as { total?: unknown };
    return typeof total === 'number' ? total : null;
  } catch {
    return null;
  }
}
