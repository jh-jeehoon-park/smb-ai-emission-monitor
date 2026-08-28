import { STORAGE_KEYS } from './storage';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = STORAGE_KEYS.theme;
/**
 * **처음 들어온 사람이 보는 테마** `[사용자 요청 2026-08-28]`. 한때 `dark`였다.
 *
 * 여기 한 곳이 초기 스크립트(`THEME_INIT_SCRIPT`)·프로바이더·`normalizeTheme`의 폴백을
 * 함께 정한다. **`globals.css`도 이미 라이트가 기본이다** — `:root`가 라이트 팔레트를 들고
 * `:root[data-theme='dark']`가 덮는 구조라, 값이 없거나 스크립트가 막힌 순간에도 라이트다.
 * 이 상수를 바꾸면 그 폴백과 방향이 같아진다.
 */
export const DEFAULT_THEME: Theme = 'light';

export function normalizeTheme(value: string | undefined | null): Theme {
  return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}

/**
 * 첫 페인트 전에 테마를 확정해 화면이 번쩍이지 않게 한다.
 * localStorage는 서버가 읽을 수 없어 서버 HTML에는 이 값이 없다 —
 * 그래서 `<html>`에 suppressHydrationWarning이 함께 필요하다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='${DEFAULT_THEME}';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
