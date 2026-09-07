import fs from 'node:fs';
import path from 'node:path';

import type { Post } from '@/types/post';

import { loadEnvLocal } from './env';

/**
 * 사이트 전체 조회수를 GoatCounter 에서 받아 굽는다 → src/data/views.json
 *
 * 사이드바의 숫자가 이 파일에서 나온다. 정적 사이트라 화면이 그릴 때 API 를
 * 부를 수 없어서(서버가 없다) 빌드 때 한 번 받아 박아 넣는다 — 숫자는 배포
 * 시점에 멈춘다. 더 자주 갱신하고 싶으면 워크플로에 cron 을 걸어 다시 굽는다.
 *
 * **절대 빌드를 멈추지 않는다.** 설정이 없거나 API 가 죽었다고 글이 배포되지
 * 않는 건 앞뒤가 바뀐 일이다. 못 받으면 파일을 안 만들고, 그러면 사이드바가
 * "조회수 집계 전"으로 선다 (lib/views.ts).
 */

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const OUT_FILE = path.join(DATA_DIR, 'views.json');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

/**
 * 집계 시작일. GoatCounter 의 /stats/total 은 start 를 안 주면 **최근 일주일**만
 * 센다 — 전체 기간을 받으려면 명시해야 한다. 첫 글보다 앞선 날은 어차피 0 이라
 * 색인에서 가장 오래된 글의 날짜를 쓴다. 글이 없으면 넉넉히 뒤로 잡는다.
 */
function startDate(): string {
  try {
    const posts = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) as Post[];
    const dates = posts.map(post => post.date).sort();
    return dates[0] ?? '2020-01-01';
  } catch {
    return '2020-01-01';
  }
}

async function main() {
  loadEnvLocal();

  const code = process.env.NEXT_PUBLIC_GOATCOUNTER_CODE;
  const token = process.env.GOATCOUNTER_API_TOKEN;

  if (!code || !token) {
    // 조용히 넘어가지 않고 한 줄 남긴다 — 배포 로그에서 "왜 숫자가 안 뜨지"를
    // 여기서 바로 알 수 있어야 한다.
    console.log('· GoatCounter 설정이 없어 조회수를 건너뛴다 (사이드바는 집계 전으로 선다)');
    return;
  }

  const url = new URL(`https://${code}.goatcounter.com/api/v0/stats/total`);
  // "should be rounded to the hour" (GoatCounter API 문서).
  url.searchParams.set('start', `${startDate()}T00:00:00Z`);

  let total: number;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn(`⚠ 조회수를 못 받았다 (HTTP ${response.status}) — 숫자 없이 굽는다`);
      return;
    }

    const body = (await response.json()) as { total?: unknown };

    if (typeof body.total !== 'number') {
      console.warn('⚠ 조회수 응답에 total 이 없다 — 숫자 없이 굽는다');
      return;
    }

    total = body.total;
  } catch (error) {
    console.warn(`⚠ 조회수를 못 받았다 (${String(error)}) — 숫자 없이 굽는다`);
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    `${JSON.stringify({ total, at: new Date().toISOString() }, null, 2)}\n`
  );
  console.log(`✓ 조회수 ${total.toLocaleString('en-US')} (${startDate()} 부터)`);
}

void main();
