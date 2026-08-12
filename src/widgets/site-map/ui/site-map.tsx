'use client';

import { useMemo, useState } from 'react';
import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { PROVISIONAL_STATUS_LABELS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { projectToMap } from '@/shared/lib/geo';
import { provinceFocus } from '@/shared/lib/map-view';
import type { Site } from '@/entities/site';

interface SiteMapProps {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const PIN_RADIUS = 6;
const PIN_RADIUS_SELECTED = 9;
/** 작은 원을 정확히 겨냥하기 어렵다. 실제 원보다 큰 투명 영역으로 잡기 쉽게 한다 */
const PIN_HIT_RADIUS = 15;
const LABEL_FONT_SIZE = 11;

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
  /** 확대는 화면을 보는 방식일 뿐 데이터 조건이 아니라 URL에 담지 않는다 */
  const [focusedProvince, setFocusedProvince] = useState<string | null>(null);
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

  const focus = useMemo(() => provinceFocus(focusedProvince), [focusedProvince]);
  /** 확대해도 글자와 핀은 화면에서 같은 크기로 남아야 읽힌다 */
  const k = focus.scale;

  const focusedHasSites = focusedProvince ? provinceState.has(focusedProvince) : true;

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <ProvinceZoomBar
        provinces={PROVINCE_SHAPES.filter((p) => provinceState.has(p.name))}
        focused={focusedProvince}
        onFocus={setFocusedProvince}
      />

      <svg
        viewBox={`${PROVINCE_VIEWBOX.x} ${PROVINCE_VIEWBOX.y} ${PROVINCE_VIEWBOX.width} ${PROVINCE_VIEWBOX.height}`}
        className="min-h-0 flex-1"
        role="img"
        aria-label={`실증 사업장 ${sites.length}개소 위치. 사업장이 있는 시도만 상태색으로 표시합니다.`}
      >
        {/**
         * viewBox가 아니라 그룹에 transform을 건다 — viewBox 속성은 CSS로 부드럽게
         * 이어지지 않는다. 감속 설정이 켜져 있으면 전역 CSS가 이 전환을 없앤다.
         */}
        <g
          style={{
            transform: `translate(${focus.translateX}px, ${focus.translateY}px) scale(${k})`,
            transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {PROVINCE_SHAPES.map((province) => {
            const state = provinceState.get(province.name);
            const visual = state?.level ? STATUS_VISUAL[state.level] : null;
            const isFocused = province.name === focusedProvince;

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
                stroke={isFocused ? 'var(--fg-subtle)' : 'var(--border-strong)'}
                strokeWidth={0.8}
                strokeLinejoin="round"
                /* 확대해도 경계선이 굵어지지 않게 한다 */
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer"
                onClick={() => setFocusedProvince(isFocused ? null : province.name)}
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
                fontSize={LABEL_FONT_SIZE / k}
                fontWeight={hasSites ? 600 : 400}
                textAnchor="middle"
                className="pointer-events-none select-none"
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
              scale={k}
              onSelect={onSelect}
              onHover={setHoveredId}
            />
          ))}
        </g>
      </svg>

      {/* 카드를 지도 위에 겹치면 지형과 핀을 가린다. 아래에 자리를 따로 잡는다 */}
      {!focusedHasSites && (
        <p className="shrink-0 border-t border-border pt-2 text-[11px] text-fg-subtle">
          이 지역에는 실증 사업장이 없습니다.
        </p>
      )}
      {focusedHasSites && active && <SiteHoverCard site={active} />}
    </div>
  );
}

/**
 * 시도 도형은 마우스로 바로 누를 수 있지만 키보드로는 잡히지 않는다(17개를 전부
 * 탭 순서에 넣으면 핀에 닿기까지 너무 멀다). 사업장이 있는 시도만 버튼으로 꺼내
 * 키보드 경로를 열어 두고, 동시에 어느 지역에 사업장이 있는지도 드러낸다.
 */
function ProvinceZoomBar({
  provinces,
  focused,
  onFocus,
}: {
  provinces: { name: string; label: string }[];
  focused: string | null;
  onFocus: (name: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="지도 확대 지역"
      className="flex shrink-0 flex-wrap items-center gap-1"
    >
      <ZoomButton active={focused === null} onClick={() => onFocus(null)}>
        전국
      </ZoomButton>
      {provinces.map((province) => (
        <ZoomButton
          key={province.name}
          active={focused === province.name}
          onClick={() => onFocus(province.name)}
        >
          {province.label}
        </ZoomButton>
      ))}
      <span className="ml-auto text-[11px] text-fg-subtle">시도를 눌러 확대</span>
    </div>
  );
}

function ZoomButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'cursor-pointer rounded-[3px] border px-1.5 py-0.5 text-[11px] transition-colors duration-200',
        active
          ? 'border-border-strong bg-surface-2 text-fg'
          : 'border-border text-fg-subtle hover:border-border-strong hover:text-fg-muted',
      )}
    >
      {children}
    </button>
  );
}

interface SitePinProps {
  site: Site;
  selected: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function SitePin({ site, selected, scale, onSelect, onHover }: SitePinProps) {
  const [lat, lng] = site.coordinates;
  const { x, y } = projectToMap(lat, lng);
  const level: StatusLevel | null = site.status;
  const visual = level ? STATUS_VISUAL[level] : null;
  const radius = (selected ? PIN_RADIUS_SELECTED : PIN_RADIUS) / scale;
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
      onClick={(e) => {
        // 핀 아래에는 시도 도형이 있다. 막지 않으면 선택과 확대가 같이 일어난다
        e.stopPropagation();
        onSelect(site.id);
      }}
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
          r={radius + 5 / scale}
          fill="none"
          stroke={visual ? visual.hex : 'var(--missing)'}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
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
        vectorEffect="non-scaling-stroke"
      />

      <circle cx={x} cy={y} r={PIN_HIT_RADIUS / scale} fill="transparent" />
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
        <span
          className="num shrink-0 text-[15px] font-semibold leading-none"
          style={{ color: ink }}
        >
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
