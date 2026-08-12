'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import {
  DEFAULT_THEME,
  normalizeTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/shared/config/theme';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * `<head>` 스크립트가 이미 확정해 둔 값을 그대로 읽는다. 마운트 후 effect로
 * 다시 set하면 렌더가 한 번 더 돌면서 화면이 번쩍인다.
 */
function readAppliedTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return normalizeTheme(document.documentElement.getAttribute('data-theme'));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readAppliedTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // 시크릿 모드 등에서 저장이 막힐 수 있다. 이번 세션 동안만 적용되면 된다.
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * 아이콘·문구를 테마 값으로 고르지 않고 둘 다 렌더한 뒤 CSS가 하나만 보여 준다.
 * 서버 HTML이 테마와 무관해져 이 버튼에서는 불일치가 날 수 없다.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex size-7 cursor-pointer items-center justify-center rounded-[4px]',
        'border border-border text-fg-muted',
        'transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      <Sun aria-hidden size={14} strokeWidth={1.9} className="theme-when-dark" />
      <Moon aria-hidden size={14} strokeWidth={1.9} className="theme-when-light" />

      {/* display:none인 쪽은 스크린리더도 읽지 않으므로 현재 상태에 맞는 문구만 전달된다 */}
      <span className="sr-only theme-when-dark">라이트 테마로 전환</span>
      <span className="sr-only theme-when-light">다크 테마로 전환</span>
    </button>
  );
}
