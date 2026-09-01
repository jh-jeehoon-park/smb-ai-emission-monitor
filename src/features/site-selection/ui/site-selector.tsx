'use client';

import { ChevronDown } from 'lucide-react';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { getSite } from '@/entities/site';
import { useScopedSites } from '../model/use-scoped-sites';
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
  /* 관할 밖 사업장을 고를 수 있으면 범위 정의가 무너진다 */
  const sites = useScopedSites();
  const site = getSite(siteId);
  const visual = site.status ? STATUS_VISUAL[site.status] : null;
  const dotColor = visual ? visual.hex : 'var(--missing)';

  return (
    /*
     * **사업장 역할에게는 이 자리가 아예 비어 있다** `[사용자 요청 2026-08-31]`.
     *
     * 한때 자사 이름을 적은 **읽기 전용 칩**을 대신 그렸다 — 드롭다운을 두면 남의 사업장으로
     * 갈 수 있어 고를 수 없게 만들되 «어느 사업장을 보고 있는가»는 남기려던 것이다. 걷는다:
     * 자사 1개소뿐이라 **바뀔 일이 없는 값**이고, 조작 줄에 앉은 조작 아닌 칩은 헤더가
     * 붐비는 값만 치른다.
     *
     * **역할로 분기하지 않는다** — 서버는 역할을 모르므로 렌더에서 가르면 하이드레이션이
     * 어긋난다. 한 벌만 그리고 `role-hide-site`가 사업장에서 통째로 감춘다.
     *
     * **기초지자체는 감추지 않는다.** 관할 내 다개소라 고를 것이 있고, 목록만 관내로 좁으면
     * 된다(`useScopedSites`).
     */
    <div className={cn('role-hide-site relative inline-flex items-center', className)}>
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
        {sites.map((s) => (
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
  );
}
