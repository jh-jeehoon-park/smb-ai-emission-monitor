'use client';

import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { Sparkline } from '@/shared/ui/sparkline';
import { RiseItem, StaggerGroup, motion } from '@/shared/ui/motion';
import type { Site } from '@/entities/site';

interface SiteWallboardProps {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** 알람 수는 alarm slice 소관이라 Site가 들고 있지 않다. 위젯에서 합친다 */
  alarmCounts: Record<string, number>;
}

/**
 * 다사업장 통합 관제(FR-31~33)를 한 줄로 압축한 화면 요소다.
 * 관제실 월보드처럼 전체를 훑고 이상한 곳으로 바로 들어가는 것이 목적이다.
 */
export function SiteWallboard({ sites, selectedId, onSelect, alarmCounts }: SiteWallboardProps) {
  return (
    <StaggerGroup className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
      {sites.map((site) => {
        const visual = site.status ? STATUS_VISUAL[site.status] : null;
        const accent = visual ? visual.hex : 'var(--missing)';
        const selected = site.id === selectedId;

        return (
          <RiseItem key={site.id}>
            <button
              type="button"
              onClick={() => onSelect(site.id)}
              aria-pressed={selected}
              className={cn(
                'group relative w-full cursor-pointer overflow-hidden rounded-[5px] border bg-surface p-3 text-left',
                'transition-colors duration-200',
                selected
                  ? 'border-border-strong bg-surface-2'
                  : 'border-border hover:border-border-strong hover:bg-surface-2',
              )}
            >
              {/* 등급 색은 카드 왼쪽 띠가 전담한다 — 카드 전체를 물들이면 값이 읽히지 않는다 */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ backgroundColor: accent }}
              />

              {selected && (
                <motion.span
                  layoutId="site-selected-ring"
                  className="pointer-events-none absolute inset-0 rounded-[5px] ring-1 ring-inset"
                  style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 45%, transparent)` }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}

              <div className="flex items-start justify-between gap-2 pl-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-fg">{site.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                    {site.industry} · {site.region}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] leading-none"
                  style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
                  aria-hidden
                >
                  {visual ? visual.glyph : '—'}
                </span>
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-2 pl-2">
                <div>
                  <p
                    className="num text-[22px] font-semibold leading-none"
                    style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
                  >
                    {site.anomalyScore ?? '—'}
                  </p>
                  {/* 등급 라벨은 늘 한글이다 — 자간을 벌리면 낱글자로 흩어진다 */}
                  <p className="mt-1 whitespace-nowrap text-[11px] text-fg-subtle">
                    {site.status ? PROVISIONAL_STATUS_LABELS[site.status] : '통신 두절'}
                  </p>
                </div>
                <Sparkline
                  values={site.spark}
                  color={accent}
                  width={72}
                  height={22}
                />
              </div>

              {(alarmCounts[site.id] ?? 0) > 0 && (
                <p className="mt-2 pl-2 text-[11px] text-fg-muted">
                  미확인 알람 <span className="num text-fg">{alarmCounts[site.id]}</span>건
                </p>
              )}
            </button>
          </RiseItem>
        );
      })}
    </StaggerGroup>
  );
}
