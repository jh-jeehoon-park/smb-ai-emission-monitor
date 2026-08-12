'use client';

import { Waves } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DEMO_NOTICE, DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { ThemeToggle } from '@/shared/ui/theme';
import { countOpenAlarms } from '@/entities/alarm';
import { SiteSelector, useSiteHref } from '@/features/site-selection';
import { ALARM_NAV_HREF, NAV_ITEMS, navLabelOf } from '../config/navigation';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const openAlarmCount = countOpenAlarms();

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-[212px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="flex size-7 items-center justify-center rounded-[5px] bg-normal/12 text-normal">
            <Waves size={15} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[13px] font-semibold leading-none tracking-tight text-fg">
              AquaSense
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              AI Platform
            </p>
          </div>
        </div>

        <SiteNav pathname={pathname} openAlarmCount={openAlarmCount} />

        {/* 서버가 없어 역할을 클라이언트가 들고 있다. 이건 인가가 아니라 시연 표시다(E6 예외). */}
        <div className="border-t border-border p-3">
          <p className="text-[11px] text-fg-subtle">시연 계정</p>
          <p className="mt-0.5 text-[11px] text-fg-muted">관리자 · 전체 사업장</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-bg">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-[14px] font-semibold tracking-tight text-fg">
                {navLabelOf(pathname)}
              </h1>
              <span className="rounded-[3px] border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                Demo
              </span>
              <SiteSelector className="w-[208px]" />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
              <span className="flex items-center gap-1.5 text-normal">
                <span className="relative flex size-1.5">
                  <span className="live-pulse absolute inset-0 rounded-full" />
                  <span className="relative size-1.5 rounded-full bg-normal" />
                </span>
                수신 중 · {COLLECTION_INTERVAL_MINUTES}분 주기
              </span>
              <span className="num">{formatDateTime(DEMO_NOW_ISO)} KST</span>
              <ThemeToggle />
            </div>
          </div>

          <p className="border-t border-border bg-surface px-4 py-1.5 text-[12px] text-fg-subtle lg:px-6">
            {DEMO_NOTICE}
          </p>
        </header>

        <main className="flex-1 px-4 py-4 lg:px-6 lg:py-5">{children}</main>
      </div>
    </div>
  );
}

function SiteNav({ pathname, openAlarmCount }: { pathname: string; openAlarmCount: number }) {
  const withSite = useSiteHref();

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {NAV_ITEMS.map((item) => {
        const active = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={withSite(item.href)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[12px]',
              'transition-colors duration-200',
              active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
            )}
          >
            <item.icon size={14} strokeWidth={1.9} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.href === ALARM_NAV_HREF && openAlarmCount > 0 && (
              <span className="num rounded-full bg-critical/16 px-1.5 py-px text-[11px] text-critical">
                {openAlarmCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
