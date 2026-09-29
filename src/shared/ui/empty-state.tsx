import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * **아직 채울 수 없는 자리** — 왜 비었는지와 다음에 할 일을 한 덩어리로 말한다
 * `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 예전에는 회색 띠 한 줄(`bg-surface-2` 문단)이었다. 입력 칸 자리에 문장 하나만 있어 **무엇을
 * 눌러야 풀리는지**가 없었고, 문장이 다른 안내 줄과 같은 모양이라 «이 칸이 막혀 있다»는
 * 사실이 눈에 띄지 않았다.
 *
 * **색은 중립이다** — 상태색을 빌리면 «위험 등급»으로 읽힌다(`Notice`와 같은 판단). 조작
 * 하나(`action`)만 포인트색이 된다(§8 `포인트색`: 조작에만).
 *
 * `Notice`와 가르는 것: 그쪽은 **페이지 전체**의 오류(404·403·500)이고 숫자 코드가 제목이다.
 * 이쪽은 **카드 한 칸**이 아직 비었다는 것이다.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-nested border border-dashed border-border-strong bg-surface-2 px-6 py-8 text-center',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className="mb-1 grid size-10 place-items-center rounded-full bg-surface text-fg-subtle shadow-panel"
        >
          {icon}
        </span>
      )}
      <p className="text-[14px] font-semibold text-fg">{title}</p>
      {description && (
        <p className="max-w-[52ch] text-[12px] leading-relaxed text-fg-subtle">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
