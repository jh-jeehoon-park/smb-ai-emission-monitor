export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'aquasense-theme';
export const DEFAULT_THEME: Theme = 'dark';

export function normalizeTheme(value: string | undefined | null): Theme {
  return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}

/**
 * 첫 페인트 전에 테마를 확정해 화면이 번쩍이지 않게 한다.
 * localStorage는 서버가 읽을 수 없어 서버 HTML에는 이 값이 없다 —
 * 그래서 `<html>`에 suppressHydrationWarning이 함께 필요하다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='${DEFAULT_THEME}';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
