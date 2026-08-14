import { cn } from '@/shared/lib/cn';

const HANGUL = /[가-힣]/;

/**
 * 패널 위의 작은 머리글. 라틴 표기(`AUTOENCODER`·`LSTM + ATTENTION`)에는 계기판 느낌의
 * 모노·대문자·넓은 자간을 주지만, **한글에는 주지 않는다** — 한글은 음절 하나가 이미
 * 네모 한 칸이라 자간을 벌리면 `구 미 염 색`처럼 낱글자로 흩어져 읽힌다.
 */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  const latinOnly = !HANGUL.test(children);

  return (
    <p
      className={cn(
        'text-[11px] text-fg-subtle',
        latinOnly && 'uppercase tracking-[0.14em]',
        className,
      )}
    >
      {children}
    </p>
  );
}
