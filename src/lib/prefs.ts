/**
 * 사용자 설정 — 테마 · 색상 팔레트.
 *
 * 값은 localStorage 에 저장하고, 실제 상태는 <html> 이 들고 있다
 * (테마 = class="dark" / "light", 팔레트 = class="palette-soft" / "palette-neon").
 * 첫 페인트 전에 PREFS_BOOT_SCRIPT 가 둘을 복원하므로 새로고침 때 깜빡임이 없다.
 *
 * 언어는 여기 없다. 주소가 곧 언어라서(proxy 가 `/dev` 를 한국어로, `/en/dev` 를
 * 영어로 가른다) 저장할 값이 아니다 — localStorage 에 적어 두면 주소와 어긋날 수
 * 있는 값이 하나 더 생긴다. <html lang> 은 서버가 [lng] 로 정하고, 언어를 고르는
 * UI 는 SettingsControls 가 라우터를 태운다.
 *
 * 선택 UI 의 활성 칸도 JS 상태가 아니라 <html> 을 보는 CSS 로 칠한다
 * (globals.css 의 theme-* · palette-* · lang-* variant). 그래서 하이드레이션
 * 전에도 항상 맞는 칸이 켜져 있다.
 */

export const THEME_KEY = 'theme';
export const PALETTE_KEY = 'palette';

export type Theme = 'system' | 'light' | 'dark';

export type Palette = 'vivid' | 'soft' | 'neon';

/**
 * <head> 안에서 동기 실행 — localStorage 값을 <html> 에 되돌린다.
 *
 * 팔레트를 테마보다 먼저 읽는다. neon 이면 저장된 테마가 무엇이든 dark 를
 * 붙여야 하기 때문이다 (저장 시점에 맞춰 두지만, 손으로 고쳐 넣은 값이나
 * 예전 버전이 남긴 값에도 화면이 깨지지 않게 한다).
 */
export const PREFS_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var p=localStorage.getItem("${PALETTE_KEY}");if(p==="soft"||p==="neon")d.classList.add("palette-"+p);var t=localStorage.getItem("${THEME_KEY}");if(p==="neon")d.classList.add("dark");else if(t==="dark"||t==="light")d.classList.add(t)}catch(e){}})()`;

/* ---------- 외부 스토어 ----------
   진짜 상태는 <html> 이 들고 있다. 선택 UI 는 useSyncExternalStore 로 그걸
   구독한다 — useState + useEffect 로 흉내내면 하이드레이션 직후 한 번 더
   렌더가 돌고(react-hooks/set-state-in-effect), 서버 값이 잠깐 비친다. */

const listeners = new Set<() => void>();

export function subscribePrefs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

/** localStorage 는 사파리 프라이빗 모드 등에서 던진다 — 설정은 실패해도 앱은 산다. */
function store(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장만 포기한다. 이번 세션 동안은 <html> 에 반영된 값이 유지된다.
  }
}

export function readTheme(): Theme {
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  return 'system';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // neon 은 다크에서만 성립한다. 설정 패널이 이미 시스템 · 라이트 칸을
  // 잠그지만, 함수 하나만 불려도 불변식이 서야 한다.
  if (readPalette() === 'neon' && theme !== 'dark') return;

  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  // system 은 값을 지운다 — 저장된 게 없으면 OS 설정을 따른다.
  store(THEME_KEY, theme === 'system' ? null : theme);
  emit();
}

export function readPalette(): Palette {
  const root = document.documentElement;
  if (root.classList.contains('palette-neon')) return 'neon';
  if (root.classList.contains('palette-soft')) return 'soft';
  return 'vivid';
}

export function applyPalette(palette: Palette) {
  const root = document.documentElement;
  root.classList.toggle('palette-soft', palette === 'soft');
  root.classList.toggle('palette-neon', palette === 'neon');
  // vivid 는 값을 지운다 — 저장된 게 없으면 기본 팔레트다.
  store(PALETTE_KEY, palette === 'vivid' ? null : palette);

  // 클래스를 먼저 바꾼 뒤에 테마를 부른다. applyTheme 의 가드가 readPalette 로
  // 지금 팔레트를 확인하므로 순서가 뒤집히면 다크 전환이 막힌다.
  //
  // neon 에서 빠져나올 때 테마는 다크로 남긴다. 되돌릴 값을 기억하려면 저장할
  // 상태가 하나 더 생기는데, 그 값이 맞는지 사용자가 확인할 방법이 없다 —
  // 테마 칸이 방금 풀렸으니 원하는 값을 바로 누르면 된다.
  if (palette === 'neon') applyTheme('dark');
  else emit();
}

/* 서버에는 DOM 이 없다. <html> 에 클래스가 없는 상태 = 아래 기본값. */
export const SERVER_THEME: Theme = 'system';
export const SERVER_PALETTE: Palette = 'vivid';
