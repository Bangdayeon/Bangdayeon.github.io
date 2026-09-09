import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/config/site';

/**
 * 정적 내보내기에서는 라우트 핸들러가 요청 없이 한 번만 돌도록 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [`${basePath}/search`],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
