import type { Locale } from '@/i18n.config';

/** 소개 아래 줄 세우는 바깥 링크 한 칸. */
export type ProfileLink = {
  label: string;
  href: string;
};

export type Profile = {
  name: string;
  bio: string;
  avatar?: { src: string; alt: string };
  /** 없거나 비어 있으면 그 줄 자체가 안 선다 (SidebarProfile). */
  links?: ProfileLink[];
};

/* 주소는 언어를 타지 않는다 — 한 벌만 두고 양쪽이 같은 값을 본다.
   이름만 판마다 다르다 (앱 이름이 두 나라 말로 다르게 붙어 있다). */
const GITHUB_URL = 'https://github.com/Bangdayeon';
const BINGKET_URL = 'https://apps.apple.com/kr/app/%EB%B9%99%ED%82%B7-bingket/id6761634987';

/**
 * 사이드바 프로필 — 언어마다 한 벌.
 *
 * 문구인데도 locales/*.json 이 아니라 여기 있는 이유는 SITE_NAME 과 같다:
 * 이건 화면의 UI 문구가 아니라 사이트의 신원이라, 번역이 빠졌을 때 다른
 * 언어로 떨어지면(i18next 의 fallbackLng) 오히려 틀린 값이 된다. 표로 두면
 * 언어를 하나 늘릴 때 타입이 빠진 칸을 잡아 준다.
 */
export const PROFILE: Record<Locale, Profile> = {
  ko: {
    name: '감자',
    bio: '프론트엔드 개발자(?)',
    avatar: { src: '/profile.jpeg', alt: '프로필' },
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: '빙킷', href: BINGKET_URL },
    ],
  },
  en: {
    name: 'POTATO',
    bio: 'FRONTEND DEVELOPER',
    avatar: { src: '/profile.jpeg', alt: 'Profile' },
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Bingket', href: BINGKET_URL },
    ],
  },
};
