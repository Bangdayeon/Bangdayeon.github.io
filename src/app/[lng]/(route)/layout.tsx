import { buildNav } from '@/config/nav';
import { PROFILE } from '@/config/profile';
import { SITE_NAME } from '@/config/site';

import { AppShell } from '@/components/AppShell';

/** 사이트 골격. (dev) 그룹(/tokens)에는 붙지 않는다. */
export default async function RouteLayout({ children }: { children: React.ReactNode }) {
  return (
    // views={null} — 분석 도구가 아직 미설치다 (README 미결정). 붙으면 여기서
    // 실제 값을 넘긴다. 서버 컴포넌트라 집계 API 호출도 이 자리에 들어간다.
    <AppShell siteName={SITE_NAME} nav={await buildNav()} profile={PROFILE} views={null}>
      {children}
    </AppShell>
  );
}
