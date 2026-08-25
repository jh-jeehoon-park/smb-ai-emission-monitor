import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface PanelProps {
  title?: string;
  /**
   * 제목 **바로 옆**에 붙는 것. 인포 아이콘처럼 제목을 보충하는 것에 쓴다 —
   * `action`(머리 오른쪽 끝)에 두면 제목과 멀어 무엇을 설명하는지 알 수 없다.
   */
  titleAside?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * 카드.
 *
 * **여백은 뿌리 한 곳에서만 낸다**(20px) `[사용자 지시 2026-08-24]`. 예전에는 헤더가
 * `pt/px`, 본문이 `px/pb`를 각자 냈고 표·차트 카드는 본문 여백을 `p-0`으로 지웠다 —
 * 그러면 카드 안의 내용이 좌우 여백 없이 카드 끝에 붙어, 제목과 표 첫 열이 어긋났다.
 * 이제 모든 자식이 이 여백 안에서 산다.
 */
export function Panel({ title, titleAside, action, children, className, bodyClassName }: PanelProps) {
  return (
    <section
      className={cn(
        // min-w-0 이 없으면 그리드·플렉스 안에서 내용 폭만큼 늘어나 좁은 화면을 넘어간다
        'flex min-w-0 flex-col rounded-panel border border-card-border bg-surface p-5 shadow-panel',
        className,
      )}
    >
      {(title || titleAside || action) && (
        /*
         * 좁은 화면에서는 필터 묶음이 제목 아래로 내려간다. 한 줄에 붙들면 카드가 화면을 넘는다.
         *
         * **구분선을 두지 않는다** `[사용자 지시 2026-08-24]`. 선이 없으니 제목과 내용을
         * 가르는 것은 여백뿐이라, 아래 여백(16px)을 카드 여백(20px)보다 좁게 두어 제목이
         * 내용에 붙어 보이게 한다.
         */
        <header className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {title && <h2 className="truncate text-[15px] font-bold text-fg">{title}</h2>}
            {titleAside}
          </div>
          {/* max-w-full 이 없으면 필터 묶음이 내용 폭을 그대로 주장해 헤더가 화면을 넘는다 */}
          {action && <div className="max-w-full shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}
