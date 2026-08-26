import type { Profile } from '@/config/profile';

import { cn } from '@/lib/cn';

import { Logo } from '@/components/Logo';

/**
 * 1234 → 1,234. Intl 을 쓰지 않는 이유는 하이드레이션이다 — 서버(Node)와
 * 브라우저의 ICU 가 다르면 같은 숫자가 다른 문자열이 되어 불일치가 난다.
 */
function formatCount(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 사이드바 맨 위 프로필 — 사진 · 이름 · 조회수 · 소개.
 *
 * 넷 다 한 줄에 하나씩 세로로 쌓는다. 224px 폭에서 사진과 이름을 가로로
 * 앉히면 이름이 두세 글자 만에 잘리고, 그 아래 소개글만 폭을 다 쓰게 되어
 * 왼쪽 정렬선이 두 개가 된다.
 *
 * 가운데 정렬이다. 아래 메뉴는 왼쪽 정렬이라 기준선이 서로 다른데, 그
 * 어긋남이 곧 "여기는 메뉴가 아니다"라는 표시가 된다 — 구분선과 함께 두
 * 영역을 갈라 준다.
 *
 * 글씨 크기는 브리프 7장 금지사항(좌측 네비의 작은 회색 글씨)을 피해 잡았다 —
 * 소개는 15px 먹색이고, 회색은 조회수 단위 한 단어에만 쓴다.
 */
export function SidebarProfile({
  profile,
  views,
  className,
}: {
  profile: Profile;
  /** 사이트 전체 조회수. 아직 집계 수단이 없으면 null — 자리만 지킨다. */
  views: number | null;
  className?: string;
}) {
  return (
    <section
      aria-label="프로필"
      className={cn(
        'border-line-subtle flex flex-col items-center gap-3 border-b px-4 py-4 text-center',
        className
      )}
    >
      {profile.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- R2 이미지를 next/image 에 물리지 않는다 (README 규약)
        <img
          src={profile.avatar.src}
          alt={profile.avatar.alt}
          width={64}
          height={64}
          decoding="async"
          className="border-line-subtle size-16 rounded-full border object-cover"
        />
      ) : (
        // 사진이 없을 때. 빈 원을 두면 로딩 실패처럼 보여서 마크를 넣는다.
        <span
          aria-hidden="true"
          className="bg-surface-muted text-ink-muted border-line-subtle grid size-16 place-items-center rounded-full border"
        >
          <Logo className="size-8" />
        </span>
      )}

      <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
        {/* 가운데 정렬에서는 truncate 의 말줄임이 한쪽으로 쏠려 보인다.
            대신 긴 이름은 줄바꿈으로 흘린다 (사이드바 폭 224px). */}
        <p className="text-title-sm text-ink-strong break-keep">{profile.name}</p>

        <p className="text-meta">
          {views === null ? (
            <span className="text-ink-muted">조회수 집계 전</span>
          ) : (
            <>
              <span className="text-ink font-semibold">{formatCount(views)}</span>{' '}
              <span className="text-ink-muted">조회</span>
            </>
          )}
        </p>
      </div>

      <p className="text-body-sm text-ink">{profile.bio}</p>
    </section>
  );
}
