'use client';

import { useMemo, useState } from 'react';
import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { PROVISIONAL_STATUS_LABELS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { projectToMap } from '@/shared/lib/geo';
import type { Site } from '@/entities/site';

interface SiteMapProps {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const PIN_RADIUS = 6;
const PIN_RADIUS_SELECTED = 9;

/** 등급이 높을수록 뒤에 오도록 — 한 시도에 여러 사업장이 있으면 가장 나쁜 상태로 칠한다 */
const SEVERITY: StatusLevel[] = ['normal', 'caution', 'warning', 'critical'];

function worstLevel(levels: (StatusLevel | null)[]): StatusLevel | null {
  let worst: StatusLevel | null = null;
  for (const level of levels) {
    if (!level) continue;
    if (!worst || SEVERITY.indexOf(level) > SEVERITY.indexOf(worst)) worst = level;
  }
  return worst;
}

export function SiteMap({ sites, selectedId, onSelect }: SiteMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const active = sites.find((s) => s.id === (hoveredId ?? selectedId));

  /**
   * 사업장이 있는 시도만 상태색으로 칠한다. 17개를 균일하게 칠하면
   * 데이터가 없는 지역까지 무언가 있는 것처럼 읽힌다.
   */
  const provinceState = useMemo(() => {
    const map = new Map<string, { level: StatusLevel | null; count: number }>();
    for (const site of sites) {
      const prev = map.get(site.province);
      map.set(site.province, {
        level: worstLevel([prev?.level ?? null, site.status]),
        count: (prev?.count ?? 0) + 1,
      });
    }
    return map;
  }, [sites]);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <svg
        viewBox={`${PROVINCE_VIEWBOX.x} ${PROVINCE_VIEWBOX.y} ${PROVINCE_VIEWBOX.width} ${PROVINCE_VIEWBOX.height}`}
        className="min-h-0 flex-1"
        role="img"
        aria-label={`실증 사업장 ${sites.length}개소 위치. 사업장이 있는 시도만 상태색으로 표시합니다.`}
      >
        {PROVINCE_SHAPES.map((province) => {
          const state = provinceState.get(province.name);
          const visual = state?.level ? STATUS_VISUAL[state.level] : null;

          return (
            <path
              key={province.name}
              d={province.d}
              /* 사업장 없는 시도도 형태는 읽혀야 한다. 패널 배경과 같은 색이면 지도가 사라진다 */
              fill={
                visual
                  ? `color-mix(in srgb, ${visual.hex} 26%, var(--surface-3))`
                  : 'var(--surface-3)'
              }
              stroke="var(--border-strong)"
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          );
        })}

        {PROVINCE_SHAPES.map((province) => {
          const { x, y } = projectToMap(province.labelAt[0], province.labelAt[1]);
          const hasSites = provinceState.has(province.name);

          return (
            <text
              key={province.name}
              x={x}
              y={y}
              fill={hasSites ? 'var(--fg-muted)' : 'var(--fg-subtle)'}
              fontSize={11}
              fontWeight={hasSites ? 600 : 400}
              textAnchor="middle"
              className="select-none"
            >
              {province.label}
            </text>
          );
        })}

        {sites.map((site) => (
          <SitePin
            key={site.id}
            site={site}
            selected={site.id === selectedId}
            onSelect={onSelect}
            onHover={setHoveredId}
          />
        ))}
      </svg>

      {/* 카드를 지도 위에 겹치면 지형과 핀을 가린다. 아래에 자리를 따로 잡는다 */}
      {active && <SiteHoverCard site={active} />}
    </div>
  );
}

interface SitePinProps {
  site: Site;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function SitePin({ site, selected, onSelect, onHover }: SitePinProps) {
  const [lat, lng] = site.coordinates;
  const { x, y } = projectToMap(lat, lng);
  const level: StatusLevel | null = site.status;
  const visual = level ? STATUS_VISUAL[level] : null;
  const radius = selected ? PIN_RADIUS_SELECTED : PIN_RADIUS;
  const label = level
    ? `${site.name} · ${PROVISIONAL_STATUS_LABELS[level]} · 이상 점수 ${site.anomalyScore}`
    : `${site.name} · 통신 두절`;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      className="cursor-pointer"
      onClick={() => onSelect(site.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(site.id);
        }
      }}
      onMouseEnter={() => onHover(site.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(site.id)}
      onBlur={() => onHover(null)}
    >
      {selected && (
        <circle
          cx={x}
          cy={y}
          r={radius + 5}
          fill="none"
          stroke={visual ? visual.hex : 'var(--missing)'}
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}

      {/* 값이 없으면 채우지 않는다 — 색이 아니라 형태로 '수신 없음'을 구분한다 */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={visual ? visual.hex : 'transparent'}
        stroke={visual ? 'var(--surface)' : 'var(--missing)'}
        strokeWidth={2}
      />

      {/* 작은 원을 정확히 겨냥하기 어렵다. 실제 원보다 큰 투명 영역으로 잡기 쉽게 한다 */}
      <circle cx={x} cy={y} r={15} fill="transparent" />
    </g>
  );
}

/** hover·포커스 시 상태 요약. 지도를 떠나지 않고 사업장을 훑을 수 있어야 한다 */
function SiteHoverCard({ site }: { site: Site }) {
  const level: StatusLevel | null = site.status;
  const visual = level ? STATUS_VISUAL[level] : null;
  const ink = visual ? visual.ink : 'var(--fg-subtle)';

  return (
    <div className="shrink-0 border-t border-border pt-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[12px] font-medium text-fg">{site.name}</p>
        <span className="num shrink-0 text-[15px] font-semibold leading-none" style={{ color: ink }}>
          {site.anomalyScore ?? '—'}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-fg-subtle">{site.address}</span>
        <span className="shrink-0" style={{ color: ink }}>
          {level ? (
            <>
              <span aria-hidden className="mr-1 text-[8px]">
                {visual?.glyph}
              </span>
              {PROVISIONAL_STATUS_LABELS[level]}
            </>
          ) : (
            '통신 두절'
          )}
        </span>
      </div>
    </div>
  );
}
