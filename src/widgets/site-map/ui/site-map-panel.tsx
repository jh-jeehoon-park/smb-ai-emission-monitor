'use client';

import { PROVISIONAL_STATUS_LABELS, PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import type { Site } from '@/entities/site';
import { SiteMap } from './site-map';

interface SiteMapPanelProps {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** 주면 그 관할 하나만 그린다. 상세는 `SiteMap`의 같은 프롭 주석 */
  municipality?: string;
}

/**
 * 범례는 패널 헤더(action 자리)로 올린다. 본문에 두면 지도 높이를 그만큼 빼앗는데,
 * 화면이 낮은 모니터에서는 그 28px이 시도 라벨을 읽을 수 있느냐를 가른다.
 *
 * **두 축을 함께 적는다** `[사용자 지시 2026-08-24]` — 시도 면의 블루 농도는 **사업장 수**,
 * 핀 색은 **상태 등급**이다. 예전에는 면도 등급색이라 범례가 등급 하나만 설명했는데,
 * 이제 면이 다른 것을 말하므로 그 축을 적지 않으면 농도가 심각도로 읽힌다.
 *
 * **관할 모드에서는 면 축을 뺀다**(`density={false}`) — 도형이 하나라 견줄 대상이 없다.
 * 계단 세 칸을 그대로 두면 있지도 않은 비교를 설명하게 된다.
 */
export function SiteMapLegend({ density = true }: { density?: boolean } = {}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {PROVISIONAL_STATUS_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-1 text-[12px] text-fg-subtle">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: STATUS_VISUAL[level].hex }}
            />
            {PROVISIONAL_STATUS_LABELS[level]}
          </li>
        ))}
        <li className="flex items-center gap-1 text-[12px] text-fg-subtle">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full border-2"
            style={{ borderColor: 'var(--missing)' }}
          />
          통신 두절
        </li>
      </ul>

      {/* 면 농도의 뜻. 계단 세 칸이 곧 1 · 2 · 3개소 이상이다 */}
      {density && (
        <span className="flex items-center gap-1 text-[12px] text-fg-subtle">
          <span aria-hidden className="flex overflow-hidden rounded-[3px]">
            {[18, 30, 42].map((mix) => (
              <span
                key={mix}
                className="inline-block size-2"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--accent) ${mix}%, var(--surface))`,
                }}
              />
            ))}
          </span>
          사업장 수
        </span>
      )}
    </div>
  );
}

/**
 * 지도만 담는다 `[사용자 지시 2026-08-24]`.
 *
 * 아래에 붙어 있던 두 줄을 걷었다 — 선택 사업장 카드는 같은 값을 아래 `이상 탐지 결과`가
 * 더 크게 보이고, 핀 위치 주석(`시·군까지만 지정`)은 근거라 화면 문서가 갖는다.
 * 그만큼 지도가 위아래 여백 안에서 커지고, 카드 높이가 선택에 따라 흔들리지 않는다.
 */
export function SiteMapPanel({ sites, selectedId, onSelect, municipality }: SiteMapPanelProps) {
  return (
    <SiteMap
      sites={sites}
      selectedId={selectedId}
      onSelect={onSelect}
      municipality={municipality}
    />
  );
}
