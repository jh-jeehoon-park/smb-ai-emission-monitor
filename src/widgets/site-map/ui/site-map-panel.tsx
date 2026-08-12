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

export function SiteMapPanel({ sites, selectedId, onSelect }: SiteMapPanelProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="h-[520px] shrink-0">
        <SiteMap sites={sites} selectedId={selectedId} onSelect={onSelect} />
      </div>

      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
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

      <p className="text-[11px] leading-relaxed text-fg-subtle">
        사업장이 있는 시도만 상태색으로 칠했습니다. 핀 위치는 주소 기준이며, 원문에 실증지
        주소가 없어 시·군까지만 지정한 시연 값입니다.
      </p>
    </div>
  );
}
