'use client';

import { ChevronDown } from 'lucide-react';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { SITES, getSite } from '@/entities/site';
import { useSelectedSiteId } from '../model/use-selected-site';

/**
 * 대시보드 밖 화면에는 지도가 없다. 여기서도 사업장을 바꿀 수 있어야
 * 화면마다 통합 관제로 돌아갔다 오지 않는다.
 *
 * 네이티브 select를 쓴다 — 목록이 OS 위젯으로 열려 키보드·스크린리더가 그대로 동작하고,
 * `color-scheme` 토큰 덕에 다크/라이트 모두 맞는 색으로 열린다.
 */
export function SiteSelector({ className }: { className?: string }) {
  const { siteId, setSiteId } = useSelectedSiteId();
  const site = getSite(siteId);
  const visual = site.status ? STATUS_VISUAL[site.status] : null;
  const dotColor = visual ? visual.hex : 'var(--missing)';

  return (
    <>
      {/* 관리자는 자사 1개소뿐이라 고를 것이 없다. 드롭다운을 두면 남의 사업장으로 갈 수 있다.
          역할로 분기하지 않고 두 벌을 그린 뒤 CSS가 고른다 — 서버는 역할을 모른다 */}
      {/* 정렬은 안쪽에서 한다. `role-only-*`가 바깥에 display:block을 강제하므로
          바깥에 flex를 걸면 죽고, 상태 점이 inline이 되어 크기를 잃는다(실제로 사라졌다) */}
      <div className={cn('role-only-admin', className)}>
        <div className="flex items-center gap-2 rounded-[4px] border border-border bg-surface px-2.5 py-1.5 text-[12px] text-fg">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <span className="truncate">
            {site.name} · {site.region}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'role-hide-admin relative inline-flex items-center',
          className,
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-2.5 size-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />

        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          aria-label="사업장 선택"
          className={cn(
            'w-full cursor-pointer appearance-none rounded-[4px] border border-border bg-surface',
            'py-1.5 pl-6 pr-7 text-[12px] text-fg',
            'transition-colors duration-200 hover:border-border-strong',
          )}
        >
          {SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.region}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden
          size={13}
          strokeWidth={2}
          className="pointer-events-none absolute right-2 text-fg-subtle"
        />
      </div>
    </>
  );
}
