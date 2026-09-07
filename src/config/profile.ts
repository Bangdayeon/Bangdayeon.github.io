export type Profile = {
  name: string;
  bio: string;
  avatar?: { src: string; alt: string };
};

export const PROFILE: Profile = {
  name: '감자',
  bio: '프론트엔드 개발자(?)',
  avatar: { src: '/profile.jpeg', alt: '프로필' },
};
