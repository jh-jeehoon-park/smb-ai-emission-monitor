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
        'flex flex-col rounded-[6px] border border-border bg-surface',
        'transition-colors duration-200 hover:border-border-strong',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && <h2 className="truncate text-[13px] font-semibold text-fg">{title}</h2>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('flex-1 p-4', bodyClassName)}>{children}</div>
    </section>
  );
}
