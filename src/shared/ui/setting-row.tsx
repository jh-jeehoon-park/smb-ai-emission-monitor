import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 설정 한 줄 — **왼쪽은 무엇인가, 오른쪽은 고치는 칸** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 예전에는 라벨·설명·조작이 전부 왼쪽 위에서 아래로 쌓였다. 카드 폭이 1,100px인데 조작은
 * 왼쪽 400px 안에 몰려 **오른쪽 3분의 2가 비었고**, 라벨과 조작이 같은 세로선 위에 있어
 * 줄마다 어디서 끝나는지가 보이지 않았다. 두 칸으로 가르면 라벨 열이 목차가 되어 훑어진다.
 *
 * **열 폭은 화면이 아니라 이 줄이 놓인 폭으로 정한다**(`@container`) — 설정 본문은 옆 목차
 * 유무에 따라 폭이 갈린다(§8 `반응형`: 중첩 격자는 컨테이너로 묻는다). 좁으면 위아래로 쌓인다.
 *
 * 설명 한 줄(`hint`)은 **그 칸이 무엇을 받는가**다 — 카드 머리 설명이 아니라 필드 도움말이라
 * §8 `보조 설명`(설명은 제목 옆 툴팁으로)의 대상이 아니다.
 */
export function SettingRow({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 칸이 입력 하나면 라벨을 그 입력에 잇는다 — 누르면 초점이 간다 */
  htmlFor?: string;
}) {
  return (
    <div className={cn('@container border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0', className)}>
      <div className="grid gap-2.5 @[40rem]:grid-cols-[200px_minmax(0,1fr)] @[40rem]:gap-6">
        <div className="min-w-0">
          {htmlFor ? (
            <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-fg">
              {label}
            </label>
          ) : (
            <p className="text-[13px] font-semibold text-fg">{label}</p>
          )}
          {hint && <p className="mt-1 text-[12px] leading-relaxed text-fg-subtle">{hint}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
