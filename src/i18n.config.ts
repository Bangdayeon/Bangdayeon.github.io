import { defineConfig } from 'next-i18next';

export const LOCALES = ['ko', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

export const i18nConfig = defineConfig({
  supportedLngs: [...LOCALES],
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: 'common',
  ns: ['common'],
  localeInPath: true,
  hideDefaultLocale: true,
  i18nextOptions: {
    returnEmptyString: false,
  },
  resourceLoader: (language, namespace) =>
    import(`./locales/${language}/${namespace}.json`).then(module => module.default),

  reloadOnPrerender: true,
});
