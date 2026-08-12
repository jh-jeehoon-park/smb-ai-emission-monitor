'use client';

import { useMemo, useState } from 'react';
import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { PROVISIONAL_STATUS_LABELS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { projectToMap } from '@/shared/lib/geo';
import { provinceFocus } from '@/shared/lib/map-view';
import type { Site } from '@/entities/site';
import { ALWAYS_LABELED_PROVINCES } from '../config/constants';

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

interface ProvinceState {
  level: StatusLevel | null;
  count: number;
}

/** 사업장이 있으면 상태색을, 없으면 중립면을 준다. hover·선택은 같은 색을 한 단계 밝힌다 */
function provinceFill(state: ProvinceState | undefined, active: boolean): string {
  const hex = state?.level ? STATUS_VISUAL[state.level].hex : null;
  if (!hex) return active ? 'var(--surface-2)' : 'var(--surface-3)';
  return `color-mix(in srgb, ${hex} ${active ? 44 : 26}%, var(--surface-3))`;
}

export function SiteMap({ sites, selectedId, onSelect }: SiteMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  /** 확대는 화면을 보는 방식일 뿐 데이터 조건이 아니라 URL에 담지 않는다 */
  const [focusedProvince, setFocusedProvince] = useState<string | null>(null);
  const active = sites.find((s) => s.id === (hoveredId ?? selectedId));

  /**
   * 사업장이 있는 시도만 상태색으로 칠한다. 17개를 균일하게 칠하면
   * 데이터가 없는 지역까지 무언가 있는 것처럼 읽힌다.
   */
  const provinceState = useMemo(() => {
    const map = new Map<string, ProvinceState>();
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

  /**
   * 핀은 시도 도형 **위에** 있어서 핀을 가리키면 도형에서 mouseleave가 난다.
   * 그대로 두면 사업장을 짚는 순간 지역 표시가 꺼져 어디를 보고 있는지 사라진다.
   * 핀을 가리키는 동안에는 그 사업장이 속한 시도를 가리키는 것으로 본다.
   */
  const activeProvince =
    hoveredProvince ??
    (hoveredId ? (sites.find((s) => s.id === hoveredId)?.province ?? null) : null);

  /**
   * 선택한 시도와 가리키는 시도 **둘 다** 테두리를 두른다.
   * 하나만 그리면 확대해 둔 상태에서 다른 지역을 가리키는 순간 지금 보고 있는 곳의
   * 테두리가 사라져, 어디를 확대했는지 알 수 없게 된다.
   */
  const outlines = PROVINCE_SHAPES.filter(
    (p) => p.name === focusedProvince || p.name === activeProvince,
  );

  /**
   * 겹친 핀은 나중에 그린 쪽이 위로 온다. 가리키는 핀과 선택한 핀을 뒤로 보내
   * 이웃에 가리지 않게 한다 — 안동 두 곳처럼 붙어 있는 쌍에서 차이가 크다.
   */
  const orderedSites = useMemo(() => {
    const weight = (site: Site) => (site.id === hoveredId ? 2 : site.id === selectedId ? 1 : 0);
    return [...sites].sort((a, b) => weight(a) - weight(b));
  }, [sites, hoveredId, selectedId]);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <ProvinceZoomBar
        provinces={PROVINCE_SHAPES.filter((p) => provinceState.has(p.name))}
        focused={focusedProvince}
        onFocus={setFocusedProvince}
        readout={activeProvince ? provinceReadout(activeProvince, provinceState) : null}
      />

      {/**
       * 지도 높이는 **뷰포트 높이에서 뺀다.** 폭 기준 분기(lg: 등)만 쓰면 화면이 낮은
       * 모니터에서 패널이 통째로 잘린다 — 실측 1366x768에서 219px이 잘렸다.
       *
       * 318 = 패널 위 크롬 108(앱 헤더·본문 여백) + 패널 안에서 지도가 아닌 부분 207
       *       (패널 헤더·확대 버튼 줄·요약 카드·설명) + 아래 여유 3. 실측으로 맞춘 값이다.
       * 상한 630은 벤치마크(soosiro)와 맞춘 값이고, 하한 400은 그 아래로 줄면
       * 시도 라벨이 8px 밑으로 내려가 읽히지 않기 때문이다 — 라벨은 뷰박스 단위라
       * 지도와 함께 작아진다.
       *
       * svh를 쓴다 — 모바일에서 주소창이 접힐 때 dvh처럼 높이가 출렁이지 않는다.
       * 계산이 CSS 안에서 끝나므로 렌더 중 window를 읽지 않는다(hydration 안전).
       */}
      <svg
        viewBox={`${PROVINCE_VIEWBOX.x} ${PROVINCE_VIEWBOX.y} ${PROVINCE_VIEWBOX.width} ${PROVINCE_VIEWBOX.height}`}
        className="mx-auto h-[clamp(400px,calc(100svh-318px),630px)] w-full max-w-[510px] shrink-0"
        role="img"
        aria-label={`실증 사업장 ${sites.length}개소 위치. 사업장이 있는 시도만 상태색으로 표시합니다.`}
        onMouseLeave={() => setHoveredProvince(null)}
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
          {PROVINCE_SHAPES.map((province) => (
            <path
              key={province.name}
              d={province.d}
              /* 사업장 없는 시도도 형태는 읽혀야 한다. 패널 배경과 같은 색이면 지도가 사라진다 */
              fill={provinceFill(
                provinceState.get(province.name),
                province.name === activeProvince || province.name === focusedProvince,
              )}
              stroke="var(--border-strong)"
              strokeWidth={0.8}
              strokeLinejoin="round"
              /* 확대해도 경계선이 굵어지지 않게 한다 */
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer transition-[fill] duration-150"
              onMouseEnter={() => setHoveredProvince(province.name)}
              /* 도형을 벗어나면 바로 지운다. svg 단위로만 처리하면 바다 위에서도
                 마지막 시도 이름이 남아 지금 가리키는 곳을 잘못 알려 준다 */
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() =>
                setFocusedProvince(province.name === focusedProvince ? null : province.name)
              }
            />
          ))}

          {/**
           * 강조 테두리는 **모든 면을 칠한 뒤에** 따로 덧그린다.
           * 도형 안에서 stroke를 주면 나중에 그려지는 이웃의 면이 맞닿은 변을 덮어
           * 경계선이 한쪽만 남는다 — 실제로 그렇게 보였다.
           */}
          {outlines.map((province) => (
            <path
              key={`outline-${province.name}`}
              d={province.d}
              fill="none"
              stroke="var(--fg)"
              strokeWidth={province.name === focusedProvince ? 1.8 : 1.4}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none"
              opacity={province.name === focusedProvince ? 0.85 : 0.55}
            />
          ))}

          {PROVINCE_SHAPES.map((province) => {
            const shown =
              ALWAYS_LABELED_PROVINCES.has(province.name) ||
              province.name === activeProvince ||
              province.name === focusedProvince;
            if (!shown) return null;

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
                /* 광역시 라벨은 이웃 면 위로 넘친다. 테두리를 둘러 글자가 묻히지 않게 한다 */
                stroke="var(--surface)"
                strokeWidth={2.5 / k}
                paintOrder="stroke"
              >
                {province.label}
              </text>
            );
          })}

          {orderedSites.map((site) => (
            <SitePin
              key={site.id}
              site={site}
              selected={site.id === selectedId}
              hovered={site.id === hoveredId}
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

function provinceReadout(name: string, state: Map<string, ProvinceState>): string {
  const count = state.get(name)?.count ?? 0;
  return `${name} · ${count > 0 ? `사업장 ${count}개소` : '사업장 없음'}`;
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
  readout,
}: {
  provinces: { name: string; label: string }[];
  focused: string | null;
  onFocus: (name: string | null) => void;
  readout: string | null;
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

      {/**
       * 가리키는 지역의 이름을 지도가 아니라 여기에 적는다. 도형 위에 띄우면
       * 작은 광역시에서는 툴팁이 도형보다 커져 정작 가리킨 곳을 덮는다.
       */}
      <span className="ml-auto truncate text-[11px] text-fg-subtle">
        {readout ?? '시도를 눌러 확대'}
      </span>
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
  hovered: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function SitePin({ site, selected, hovered, scale, onSelect, onHover }: SitePinProps) {
  const [lat, lng] = site.coordinates;
  const { x, y } = projectToMap(lat, lng);
  const level: StatusLevel | null = site.status;
  const visual = level ? STATUS_VISUAL[level] : null;
  const base = selected ? PIN_RADIUS_SELECTED : PIN_RADIUS;
  /* 가리키면 커진다 — 겹친 핀 중 어느 것을 잡았는지 눈으로 확인되어야 한다 */
  const radius = (hovered ? base + 2 : base) / scale;
  const accent = visual ? visual.hex : 'var(--missing)';
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
      {(selected || hovered) && (
        <circle
          cx={x}
          cy={y}
          r={radius + 5 / scale}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          opacity={hovered ? 0.9 : 0.6}
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
