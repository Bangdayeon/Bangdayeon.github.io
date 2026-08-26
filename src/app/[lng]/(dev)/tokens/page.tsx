import type { Metadata } from 'next';

import { CATEGORIES, CATEGORY_COLOR, categoryLabel } from '@/lib/categories';

import { LocaleLink as Link } from '@/components/LocaleLink';

export const metadata: Metadata = {
  title: '디자인 토큰',
  robots: { index: false, follow: false },
};

const INK = [
  ['text-ink-strong', '제목', '17.25 / 17.25'],
  ['text-ink', '본문', '15.96 / 14.72'],
  ['text-ink-muted', '메타 · 날짜 · 태그', '5.32 / 6.68 — AA 통과'],
  ['text-ink-subtle', '비활성 · 장식', '2.58 / 2.14 — AA 미달'],
] as const;

const SURFACE = [
  ['bg-surface', '페이지 배경 — 종이색'],
  ['bg-surface-subtle', '코드블록 · 인용'],
  ['bg-surface-muted', '눌린 면'],
  ['bg-surface-inverse', '툴팁 등 반전'],
] as const;

const LINE = [
  ['bg-line-subtle', '약한 구분'],
  ['bg-line', '기본 구분선'],
  ['bg-line-strong', '강조 구분'],
] as const;

const ROLES = [
  { name: 'primary', vivid: 'bg-primary', ink: 'text-primary-ink', subtle: 'bg-primary-subtle' },
  { name: 'error', vivid: 'bg-error', ink: 'text-error-ink', subtle: 'bg-error-subtle' },
  { name: 'success', vivid: 'bg-success', ink: 'text-success-ink', subtle: 'bg-success-subtle' },
  { name: 'warning', vivid: 'bg-warning', ink: 'text-warning-ink', subtle: 'bg-warning-subtle' },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  dev: '개발',
  design: '기획 · 디자인',
  review: '리뷰',
  toon: '인스타툰',
  travel: '여행',
  log: '일상',
};

// 앞의 두 숫자가 다르면 clamp — 375px 에서 1280px 사이를 vw 로 잇는다.
const SCALE = [
  ['text-display', '30~40 / 1.2 / 700 / -0.03em', '메인 대형 타이틀'],
  ['text-title-lg', '24~30 / 1.3 / 700 / -0.025em', '글 상세 h1'],
  ['text-title-md', '20~22 / 1.4 / 600 / -0.02em', '섹션 h2 · 목록 글 제목'],
  ['text-title-sm', '17~18 / 1.45 / 600 / -0.015em', 'h3'],
  ['text-body-lg', '16~18 / 1.8 / 400 / -0.01em', '글 본문 (720px 컬럼)'],
  ['text-body', '16 / 1.7 / 400 / -0.01em', '일반 본문 · 목록 요약'],
  ['text-body-sm', '15 / 1.6 / 400 / -0.01em', '보조 설명'],
  ['text-meta', '13 / 1.5 / 500 / 0.01em', '날짜 · 태그 · 카테고리'],
  ['text-meta-sm', '12 / 1.4 / 500 / 0.02em', '본문 흐름의 최소 크기'],
  ['text-meta-xs', '11 / 1.3 / 600 / 0.03em', '그림 안 이름표 전용 (글 그래프)'],
  ['text-label', '14 / 1.4 / 600 / 0', '버튼 · 폼 라벨'],
  ['text-nav', '14 / 1.4 / 500 / 0.02em', '좌측 네비'],
  ['text-code', '14 / 1.7 / 400 / 0', '인라인 · 블록 코드'],
] as const;

const SAMPLE = [
  ['dev', '2026.08.19', '타입 추론을 한 겹 더 파고들기'],
  ['toon', '2026.08.12', '에피소드 14 — 마감 전날'],
  ['travel', '2026.08.03', '스톡홀름 3일차, södermalm'],
  ['review', '2026.07.28', '퍼펙트 블루'],
  ['design', '2026.07.21', '정보 구조를 먼저 그린다'],
  ['log', '2026.07.14', '여름의 기록'],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-title-md text-ink-strong mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ className, name, note }: { className: string; name: string; note: string }) {
  return (
    <li className="flex items-center gap-4">
      <span className={`${className} border-line size-11 shrink-0 rounded border`} />
      <span className="min-w-0">
        <span className="text-label text-ink block">{name}</span>
        <span className="text-meta text-ink-muted block">{note}</span>
      </span>
    </li>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-[760px] px-6 py-16">
      <h1 className="text-display text-ink-strong mb-3">디자인 토큰</h1>
      <p className="text-body text-ink-muted mb-14">
        OS 테마를 바꾸거나 <code className="text-code">&lt;html&gt;</code> 에{' '}
        <code className="text-code">class=&quot;dark&quot;</code> /{' '}
        <code className="text-code">class=&quot;light&quot;</code> 를 넣어 전환을 확인한다.
      </p>

      <Section title="목록에서 색이 어떻게 보이는가">
        <ul className="border-line-subtle divide-line-subtle divide-y border-y">
          {SAMPLE.map(([cat, date, title]) => (
            <li key={title} className="flex items-baseline gap-3 py-3">
              <span
                className={`${CATEGORY_COLOR[cat].dot} size-2 shrink-0 rounded-full`}
                aria-hidden
              />
              <span className="text-meta text-ink-muted w-20 shrink-0 tabular-nums">{date}</span>
              <span className="text-body text-ink-strong min-w-0 flex-1">{title}</span>
              <span className={`text-meta shrink-0 ${CATEGORY_COLOR[cat].ink}`}>
                {categoryLabel([cat])}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-meta text-ink-muted mt-3">
          도트는 장식이다 — 카테고리 이름이 오른쪽에 텍스트로 함께 있다.
        </p>
      </Section>

      <Section title="카테고리 6색">
        <ul className="space-y-3">
          {CATEGORIES.map(cat => (
            <li key={cat} className="flex items-center gap-4">
              <span className={`${CATEGORY_COLOR[cat].dot} size-11 shrink-0 rounded`} />
              <span className={`${CATEGORY_COLOR[cat].subtle} rounded px-3 py-2`}>
                <span className={`text-label ${CATEGORY_COLOR[cat].ink}`}>
                  {cat} — {CATEGORY_LABEL[cat]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="텍스트 — ink">
        <ul className="space-y-3">
          {INK.map(([cls, use, ratio]) => (
            <li key={cls}>
              <span className={`${cls} text-body-lg block`}>다람쥐 헌 쳇바퀴에 타고파 Archive</span>
              <span className="text-meta text-ink-muted">
                {cls} · {use} · {ratio}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="배경 — surface">
        <ul className="space-y-3">
          {SURFACE.map(([cls, use]) => (
            <Swatch key={cls} className={cls} name={cls} note={use} />
          ))}
        </ul>
      </Section>

      <Section title="구분선 — line">
        <ul className="space-y-3">
          {LINE.map(([cls, use]) => (
            <Swatch key={cls} className={cls} name={cls} note={use} />
          ))}
        </ul>
      </Section>

      <Section title="역할별 3단 — vivid · ink · subtle">
        <ul className="space-y-4">
          {ROLES.map(r => (
            <li key={r.name} className="flex items-center gap-3">
              <span className={`${r.vivid} size-11 shrink-0 rounded`} />
              <span className={`${r.subtle} rounded px-3 py-2`}>
                <span className={`text-label ${r.ink}`}>{r.name}</span>
              </span>
              <span className="text-meta text-ink-muted">
                vivid 면 전용 · ink 글자용 · subtle 배경
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button className="text-label bg-primary text-primary-on hover:bg-primary-strong rounded px-4 py-2">
            버튼
          </button>
          <button className="text-label bg-warning text-warning-on rounded px-4 py-2">
            노랑 위 먹색
          </button>
          <button className="text-label bg-error text-error-on rounded px-4 py-2">삭제</button>
          <Link
            href="/about"
            className="text-body text-primary-ink decoration-primary underline underline-offset-4"
          >
            본문 링크
          </Link>
        </div>
      </Section>

      <Section title="텍스트 스케일">
        <ul className="space-y-6">
          {SCALE.map(([cls, spec, use]) => (
            <li key={cls}>
              <span className={`${cls} text-ink-strong block`}>
                구조는 밀도 있게, 표현은 2026년
              </span>
              <span className="text-meta text-ink-muted">
                {cls} · {spec} · {use}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="코드">
        <pre className="text-code bg-surface-subtle border-line overflow-x-auto rounded border p-4">
          <code className="font-mono">
            {'const post = await getPost(id);\nif (!post) notFound();'}
          </code>
        </pre>
      </Section>
    </main>
  );
}
