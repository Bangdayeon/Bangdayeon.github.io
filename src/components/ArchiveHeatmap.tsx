import type { Post } from '@/types/post';

import { cn } from '@/lib/cn';
import { serverT } from '@/lib/t';

import { LocaleLink as Link } from '@/components/LocaleLink';

/**
 * 한 해 잔디밭 — 하루 한 칸, 그날 쓴 글이 많을수록 진하다.
 *
 * 카테고리 띠가 "무엇을" 썼는지를 보여준다면 이 표는 "언제" 썼는지를 본다.
 * 위의 띠도 아래의 연표도 글이 있는 지점만 지나가므로 비어 있는 날이 안
 * 보이는데, 아카이브에서 실제로 눈에 띄어야 하는 건 오히려 그 공백이다 —
 * 얼마나 꾸준했는지는 칠한 칸이 아니라 칠하지 않은 칸이 말한다.
 *
 * 색은 한 계열(primary)의 농도만 쓴다. 카테고리 색을 섞으면 바로 위 띠와
 * 같은 말을 두 번 하게 되고, 하루에 카테고리가 둘이면 한 칸을 쪼개야 한다.
 *
 * 서버에서 한 번 그리고 끝이다 — 클라이언트 코드가 없다.
 */

const DAY_MS = 86_400_000;

/** 칸 한 변과 칸 사이 여백(px). 요일 열 · 월 이름 위치가 전부 이 둘에서 나온다. */
const CELL = 10;
const GAP = 3;
const PITCH = CELL + GAP;

const WEEKDAY_WIDTH = 20;

/**
 * 눈금 글자(요일 열 · 월 이름)와 격자 사이.
 *
 * 칸 사이 여백(GAP)과 같은 값을 쓰면 글자가 격자에 붙어 첫 열의 일부처럼
 * 읽힌다 — 눈금과 표는 다른 층이라 그 사이가 칸 사이보다 넓어야 갈린다.
 * 요일 열은 이 값만큼 옆으로, 월 이름 줄은 이 값만큼 위로 떨어진다.
 *
 * 월 이름 줄이 marginInlineStart 로 격자의 첫 열에 맞추므로 여기를 고치면
 * 그쪽도 같이 움직인다 (MonthRow 는 이 상수를 그대로 본다).
 */
const LABEL_GAP = 8;

/**
 * 농도 다섯 단.
 *
 * 0 은 유채색이 아니다 — 안 쓴 날을 연한 파랑으로 칠하면 "조금 썼다"로 읽힌다.
 * 이 표에서 제일 크게 벌어져야 하는 건 1편과 5편이 아니라 0편과 1편이라,
 * 한 편만 써도 곧장 50% 로 올라간다. 그 위로는 편수만큼 진해진다.
 *
 * 불투명도인 게 다크에서 특히 중요하다 — 뒤가 거의 검정(ramp-950)이라
 * 낮은 단은 배경에 먹힌다. 50% 에서 시작하면 0단 회색(ramp-800)과 밝기가
 * 확실히 갈린다.
 */
const LEVEL_CLASS = [
  'bg-surface-muted',
  'bg-primary/50',
  'bg-primary/70',
  'bg-primary/85',
  'bg-primary',
];

/** 글 수 → 농도. 하루 다섯 편을 넘는 일은 드물어서 고정 구간으로 끊는다. */
function levelOf(count: number) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/**
 * 날짜 계산은 전부 UTC 자정으로 한다.
 *
 * 글의 date 는 시간대 없는 'YYYY-MM-DD' 인데, 이걸 현지 시간으로 읽으면 서버와
 * 브라우저의 시간대가 다를 때 칸이 하루씩 밀린다. Date.UTC 로 만들고 여기서
 * 다시 문자열로 돌리면 그런 일이 없다. 그래서 이 표는 "오늘"을 묻지 않는다 —
 * 아직 안 온 날도 안 쓴 날과 같은 회색이라 기준일이 필요 없고, 덕분에 빌드
 * 시점에 따라 그림이 달라지지도 않는다.
 */
function toDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function ArchiveHeatmap({ year, posts }: { year: string; posts: Post[] }) {
  const { t } = await serverT();
  const number = Number(year);

  // 격자는 주 단위라 그 해의 앞뒤로 조금씩 넘친다 — 1월 1일이 낀 주의
  // 일요일에서 시작해 12월 31일이 낀 주의 토요일에서 끝난다. 그래서 열은
  // 해마다 53개일 수도, 54개일 수도 있다. 상수로 박지 않고 여기서 센다.
  const first = Date.UTC(number, 0, 1);
  const last = Date.UTC(number, 11, 31);
  const start = first - new Date(first).getUTCDay() * DAY_MS;
  const end = last + (6 - new Date(last).getUTCDay()) * DAY_MS;
  const weeks = Math.round((end - start) / DAY_MS + 1) / 7;

  const byDate = new Map<string, Post[]>();
  for (const post of posts) byDate.set(post.date, [...(byDate.get(post.date) ?? []), post]);

  const total = posts.length;
  const written = byDate.size;

  return (
    <figure>
      <figcaption className="text-meta text-ink-muted mb-2 flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="text-ink">{year}</span>
        <span>{t('heatmap.summary', { days: written, count: total })}</span>
      </figcaption>

      {/*
        좁은 화면에서는 표가 잘리지 않고 가로로 밀린다. 53열이면 686px 라
        lg(1024px) 부터는 사이드바를 펴 놔도 본문 안에 들어가므로, 거기서는
        가로 스크롤을 아예 끈다 — overflow 는 세로도 같이 자르기 때문에
        켜 두면 칸 위로 떠야 할 팝오버가 격자 높이에서 잘린다.

        lg 아래에서는 팝오버가 잘리지만 그 폭은 손가락으로 보는 화면이고,
        hover 가 없으면 애초에 열리지 않는다. 이 화면에서 글로 가는 길은
        원래도 마우스를 위한 지름길이었고, 정본은 카테고리 목록과 검색이다.
      */}
      <div className="scrollbar-slim -mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 lg:overflow-x-visible">
        {/*
          격자는 aria-hidden 이다 — 371개의 칸을 하나씩 읽히면 그게 더 나쁘고,
          위 caption 이 같은 내용을 글자로 말한다 (바로 위 카테고리 띠와 같은
          방식). 팝오버 안의 링크도 함께 가려지지만, 여기 링크는 마우스를 위한
          지름길이지 유일한 통로가 아니다 — 글로 가는 정본은 카테고리 목록과
          검색이다.
        */}
        <div aria-hidden="true" className="w-max">
          <MonthRow year={number} start={start} weeks={weeks} />

          <div className="flex" style={{ gap: LABEL_GAP }}>
            <WeekdayColumn />

            <div
              className="grid grid-flow-col"
              style={{ gap: GAP, gridTemplateRows: `repeat(7, ${CELL}px)` }}
            >
              {Array.from({ length: weeks * 7 }, (_, index) => {
                const ms = start + index * DAY_MS;
                const box = { width: CELL, height: CELL };

                // 격자가 주 단위라 그 해 밖의 날이 앞뒤로 몇 칸 딸려 온다.
                // 자리는 지키되 칠하지 않는다 — 자리를 빼면 그 열만 높이가
                // 줄어 표가 어그러진다. 아직 안 온 날은 여기 해당하지 않는다:
                // 그 해의 날이 맞으므로 안 쓴 날과 똑같이 회색으로 둔다.
                if (ms < first || ms > last) return <span key={ms} style={box} />;

                const date = toDate(ms);
                const dayPosts = byDate.get(date) ?? [];

                // 글 없는 날은 네이티브 툴팁으로 끝낸다 — 보여줄 게 날짜뿐인데
                // 칸마다 팝오버를 심으면 한 해에 350개가 넘게 딸려 온다.
                if (dayPosts.length === 0) {
                  return (
                    <span
                      key={ms}
                      title={`${date} · ${t('heatmap.noPost')}`}
                      style={box}
                      className={cn('rounded-[2px]', LEVEL_CLASS[0])}
                    />
                  );
                }

                return (
                  <span key={ms} style={box} className="group relative">
                    {/*
                      칸 자체는 누를 것이 없다. 예전에는 아래 연표의 그 날짜
                      줄로 내려가는 링크였는데, 연표를 걷어내면서 갈 곳이
                      없어졌다 — 글로 가는 길은 옆의 팝오버가 든 링크다.
                    */}
                    <span
                      className={cn(
                        'block size-full rounded-[2px]',
                        LEVEL_CLASS[levelOf(dayPosts.length)]
                      )}
                    />
                    <DayPopover
                      date={date}
                      posts={dayPosts}
                      // 위쪽 줄은 아래로, 아래쪽 줄은 위로 편다. 어느 쪽이든
                      // 격자 바깥으로 나가는 거리가 절반으로 준다.
                      below={index % 7 < 3}
                      // 오른쪽 절반의 칸은 팝오버를 왼쪽으로 물린다 —
                      // 12월 칸에서 오른쪽으로 펴면 본문 밖으로 나간다.
                      alignStart={index / 7 < weeks / 2}
                    />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

/** 팝오버에 제목을 늘어놓는 최대 편수. 넘으면 나머지는 수로만 적는다. */
const POPOVER_MAX = 4;

/**
 * 칸에 마우스를 올리면 뜨는 그날의 글.
 *
 * 제목이 링크라서 네이티브 title 로는 안 된다 — 눌러서 바로 그 글로 가야 한다.
 * 그래도 클라이언트 코드는 없다: 팝오버가 칸(.group)의 자식이라 팝오버 위에
 * 마우스가 있는 동안에도 칸의 :hover 가 살아 있고, 그 사이 4px 은 margin 이
 * 아니라 padding 으로 띄운다 (margin 이면 그 틈에서 hover 가 끊겨 팝오버가
 * 닫힌다 — 링크까지 마우스가 못 간다).
 */
async function DayPopover({
  date,
  posts,
  below,
  alignStart,
}: {
  date: string;
  posts: Post[];
  below: boolean;
  alignStart: boolean;
}) {
  const { t } = await serverT();
  const shown = posts.slice(0, POPOVER_MAX);
  const rest = posts.length - shown.length;

  return (
    <span
      className={cn(
        'absolute z-20 hidden group-hover:block',
        below ? 'top-full pt-1' : 'bottom-full pb-1',
        alignStart ? 'start-0' : 'end-0'
      )}
    >
      {/* 나머지 팝오버(Dropdown)와 같은 상자다 — 테두리 · 그림자 · 둥글기. */}
      <span className="border-line bg-surface block w-max max-w-65 rounded-lg border p-2 shadow-lg">
        <span className="text-meta-sm text-ink-muted block tabular-nums">
          {date} · {t('heatmap.dayCount', { count: posts.length })}
        </span>

        {shown.map(post => (
          <Link
            key={post.id}
            href={`/${post.id}`}
            className="text-meta-sm text-ink hover:text-primary-ink mt-1 block truncate hover:underline"
          >
            {post.title}
          </Link>
        ))}

        {rest > 0 && (
          <span className="text-meta-sm text-ink-subtle mt-1 block">
            {t('heatmap.more', { count: rest })}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * 열 위의 월 이름.
 *
 * 격자와 같은 그리드에 태우면 이름이 칸(10px)보다 넓어서 그 열만 벌어진다.
 * 그래서 이 줄만 따로 띄우고 열 간격(PITCH)으로 자리를 잡는다.
 */
async function MonthRow({ year, start, weeks }: { year: number; start: number; weeks: number }) {
  const { t } = await serverT();
  const labels: { week: number; month: number }[] = [];

  for (let week = 0; week < weeks; week += 1) {
    const monday = new Date(start + week * 7 * DAY_MS);
    const month = monday.getUTCMonth();

    // 그 달의 1일을 품은 첫 열에 이름을 건다. 다음 해로 넘어간 마지막 열과,
    // 표 밖으로 삐져나갈 만큼 오른쪽에 붙은 열은 건너뛴다.
    const already = labels.some(label => label.month === month + 1);
    if (monday.getUTCFullYear() !== year || already || week > weeks - 3) continue;

    labels.push({ week, month: month + 1 });
  }

  return (
    <div className="relative mb-1.5 h-4" style={{ marginInlineStart: WEEKDAY_WIDTH + LABEL_GAP }}>
      {labels.map(({ week, month }) => (
        <span
          key={week}
          className="text-meta-sm text-ink-subtle absolute top-0 tabular-nums"
          style={{ insetInlineStart: week * PITCH }}
        >
          {t(`months.${month}`)}
        </span>
      ))}
    </div>
  );
}

/** 왼쪽 요일. 일곱 개를 다 적으면 글자가 칸보다 빽빽해서 한 칸씩 걸러 적는다. */
async function WeekdayColumn() {
  const { t } = await serverT();

  return (
    <div className="relative shrink-0" style={{ width: WEEKDAY_WIDTH }}>
      {[
        { row: 1, label: t('heatmap.mon') },
        { row: 3, label: t('heatmap.wed') },
        { row: 5, label: t('heatmap.fri') },
      ].map(({ row, label }) => (
        <span
          key={label}
          className="text-meta-sm text-ink-subtle absolute inset-x-0 flex items-center"
          style={{ top: row * PITCH, height: CELL }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
