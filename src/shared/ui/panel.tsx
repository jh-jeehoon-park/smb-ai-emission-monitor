import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Eyebrow } from './eyebrow';

interface PanelProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, eyebrow, action, children, className, bodyClassName }: PanelProps) {
  return (
    <section
      className={cn(
        // min-w-0 이 없으면 그리드·플렉스 안에서 내용 폭만큼 늘어나 좁은 화면을 넘어간다
        'flex min-w-0 flex-col rounded-[6px] border border-border bg-surface',
        'transition-colors duration-200 hover:border-border-strong',
        className,
      )}
    >
      {(title || action) && (
        /* 좁은 화면에서는 필터 묶음이 제목 아래로 내려간다. 한 줄에 붙들면 패널이 화면을 넘는다 */
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && <h2 className="truncate text-[13px] font-semibold text-fg">{title}</h2>}
          </div>
          {/* max-w-full 이 없으면 필터 묶음이 내용 폭을 그대로 주장해 헤더가 화면을 넘는다 */}
          {action && <div className="max-w-full shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('flex-1 p-4', bodyClassName)}>{children}</div>
    </section>
  );
}
