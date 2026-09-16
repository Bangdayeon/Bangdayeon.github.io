import type { Locale } from '@/i18n.config';

export type ProfileLink = {
  label: string;
  href: string;
};

export type Profile = {
  name: string;
  bio: string;
  avatar?: { src: string; alt: string };
  links?: ProfileLink[];
};
const GITHUB_URL = 'https://github.com/Bangdayeon';
const BINGKET_URL = 'https://apps.apple.com/kr/app/%EB%B9%99%ED%82%B7-bingket/id6761634987';

export const PROFILE: Record<Locale, Profile> = {
  ko: {
    name: '방디',
    bio: '프론트엔드 개발자(?)',
    avatar: { src: '/profile.jpeg', alt: '프로필' },
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: '빙킷', href: BINGKET_URL },
    ],
  },
  en: {
    name: 'BANGDY',
    bio: 'FRONTEND DEVELOPER',
    avatar: { src: '/profile.jpeg', alt: 'Profile' },
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Bingket', href: BINGKET_URL },
    ],
  },
};
