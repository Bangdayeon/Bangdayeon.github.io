import { buildNav } from '@/config/nav';
import { PROFILE } from '@/config/profile';
import { SITE_NAME } from '@/config/site';

import { getTotalViews } from '@/lib/views';

import { AppShell } from '@/components/AppShell';

/** 사이트 골격. (dev) 그룹(/tokens)에는 붙지 않는다. */
export default async function RouteLayout({ children }: { children: React.ReactNode }) {
  return (
    // 조회수는 빌드 때 받아 구워 둔 값이다 (scripts/fetch-views.ts). 정적
    // 사이트라 그릴 때 API 를 부를 수 없고, 집계 설정이 없으면 null 이 온다.
    <AppShell siteName={SITE_NAME} nav={await buildNav()} profile={PROFILE} views={getTotalViews()}>
      {children}
    </AppShell>
  );
}
