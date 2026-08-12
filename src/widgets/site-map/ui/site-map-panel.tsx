'use client';

import { PROVISIONAL_STATUS_LABELS, PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import type { Site } from '@/entities/site';
import { SiteMap } from './site-map';

interface SiteMapPanelProps {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * 범례는 패널 헤더(action 자리)로 올린다. 본문에 두면 지도 높이를 그만큼 빼앗는데,
 * 화면이 낮은 모니터에서는 그 28px이 시도 라벨을 읽을 수 있느냐를 가른다.
 */
export function SiteMapLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {PROVISIONAL_STATUS_LEVELS.map((level) => (
        <li key={level} className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: STATUS_VISUAL[level].hex }}
          />
          {PROVISIONAL_STATUS_LABELS[level]}
        </li>
      ))}
      <li className="flex items-center gap-1 text-[11px] text-fg-subtle">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full border-2"
          style={{ borderColor: 'var(--missing)' }}
        />
        통신 두절
      </li>
    </ul>
  );
}

export function SiteMapPanel({ sites, selectedId, onSelect }: SiteMapPanelProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <SiteMap sites={sites} selectedId={selectedId} onSelect={onSelect} />

      <p className="text-[11px] leading-relaxed text-fg-subtle">
        핀 위치는 주소 기준입니다. 원문에 실증지 주소가 없어 시·군까지만 지정했습니다.
      </p>
    </div>
  );
}
