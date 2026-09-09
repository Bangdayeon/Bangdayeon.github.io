import { buildNav } from '@/config/nav';
import { PROFILE } from '@/config/profile';
import { SITE_NAME } from '@/config/site';

import { serverLocale } from '@/lib/t';
import { getTotalViews } from '@/lib/views';

import { AppShell } from '@/components/AppShell';

/** 사이트 골격. (dev) 그룹(/tokens)에는 붙지 않는다. */
export default async function RouteLayout({ children }: { children: React.ReactNode }) {
  // 사이트 이름과 프로필은 언어마다 한 벌이다 (config/site · config/profile).
  // 고르는 일은 여기서 한 번만 한다 — AppShell 부터 아래는 전부 클라이언트
  // 컴포넌트라 serverLocale() 을 부를 수 없다.
  const locale = await serverLocale();

  return (
    // 조회수는 빌드 때 받아 구워 둔 값이다 (scripts/fetch-views.ts). 정적
    // 사이트라 그릴 때 API 를 부를 수 없고, 집계 설정이 없으면 null 이 온다.
    <AppShell
      siteName={SITE_NAME[locale]}
      nav={await buildNav()}
      profile={PROFILE[locale]}
      views={getTotalViews()}
    >
      {children}
    </AppShell>
  );
}
