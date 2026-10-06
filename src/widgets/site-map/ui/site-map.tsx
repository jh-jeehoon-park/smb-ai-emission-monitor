'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import {
  PROVISIONAL_STATUS_LABELS,
  PROVISIONAL_STATUS_LEVELS,
  type StatusLevel,
} from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { projectToMap } from '@/shared/lib/geo';
import {
  type MapFocus,
  type Rect,
  provinceFocus,
  singleProvinceView,
} from '@/shared/lib/map-view';
import type { Site } from '@/entities/site';
import {
  ALWAYS_LABELED_PROVINCES,
  MAP_LABEL_FONT_SIZE,
  TOOLTIP_DETAIL_SIZE,
  TOOLTIP_EDGE_PADDING,
  TOOLTIP_LINE_GAP,
  TOOLTIP_PADDING_X,
  TOOLTIP_PADDING_Y,
  TOOLTIP_PIN_GAP,
  TOOLTIP_TITLE_SIZE,
} from '../config/constants';
import { placeTooltip, tooltipSize } from '../lib/tooltip-layout';
import { useAnimatedFocus } from '../lib/use-animated-focus';
import { useScreenUnit } from '../lib/use-screen-unit';
import {
  SEG_ITEM,
  SEG_ITEM_OFF,
  SEG_ITEM_ON,
  SEG_TRACK,
  SegPill,
} from '@/shared/ui/segmented-control';

interface SiteMapProps {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
  /**
   * 관할 시·군·구 이름을 주면 **그 관할이 속한 시도 한 장**을 그리고 핀은 넘어온 것만 찍는다
   * `[사용자 결정 2026-08-26]`. 없으면 전국 시도 지도다.
   *
   * **시·군·구 경계를 그리지 않는다.** 한때 관할 도형만 그렸는데 낯선 형태가 홀로 떠
   * 어디인지 읽히지 않았다 — 시도는 눈에 익어 위치가 바로 잡힌다. 범위를 말하는 것은
   * **핀과 머리글**이고 면은 배경이다.
   *
   * 그래서 축척도 시도 지도와 같은 길을 쓴다(`provinceFocus`) — 경북이 1.9배라
   * 확대 상한(`MAX_MAP_ZOOM` 3) 안에 든다.
   */
  municipality?: string;
  /**
   * **주소가 지금 사업장을 지목하고 있는가.** 아래 `autoProvince`가 읽는다.
   *
   * 마운트 시점이 아니라 **매 렌더의 값**이다 — 고르면 참이 되고 그 뒤로 거짓이 되지 않으므로
   * «아직 고른 적 없음»과 같은 뜻이 된다. 없으면 거짓으로 보고 전국을 보인다.
   */
  siteChosen?: boolean;
}

/**
 * 지도가 그리는 도형. 시도와 시·군·구가 같은 네 키를 공유해 렌더 경로를 하나로 둔다.
 * 시·군·구 쪽은 `viewBox`를 더 갖지만 그리는 데는 쓰이지 않는다.
 */
interface MapShape {
  name: string;
  label: string;
  labelAt: [lat: number, lng: number];
  d: string;
}

/** 3D 층의 두께(뷰박스 단위). 4를 넘으면 남해 섬들이 자기 그림자에 묻힌다 */
const MAP_DEPTH = 3;

/**
 * 마커 경로 — **끝이 원점, 머리 중심은 위로 12** `[사용자 지시 2026-08-24]`.
 *
 * 끝을 원점으로 잡아야 확대·hover로 크기가 바뀌어도 짚는 자리가 움직이지 않는다.
 * 머리 반지름 8, 전체 높이 20(뷰박스 단위)이며 화면에서는 배율로 나눠 일정하게 보인다.
 */
const PIN_PATH = 'M0 0 C -3.4 -4.6 -8 -7.4 -8 -12 A8 8 0 1 1 8 -12 C8 -7.4 3.4 -4.6 0 0 Z';

/** 머리 아래쪽을 누르는 안쪽 그림자. 호가 아니라 2차 곡선이라 방향 플래그가 필요 없다 */
const PIN_INNER_SHADE = 'M-5.8 -9.4 Q0 -5.2 5.8 -9.4';
/** 작은 원을 정확히 겨냥하기 어렵다. 실제 원보다 큰 투명 영역으로 잡기 쉽게 한다 */
const PIN_HIT_RADIUS = 15;

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
  /** 시도 요약 문구에만 쓴다 — 면 색은 이제 상태가 아니라 개수를 말한다 */
  level: StatusLevel | null;
  count: number;
}

/**
 * **면은 브랜드 블루 한 계열의 그라데이션이다** `[사용자 지시 2026-08-24: 첨부 이미지 참고]`.
 *
 * 예전에는 시도를 **가장 나쁜 상태의 등급색**으로 칠했다. 그림은 화려했지만 한 시도에 사업장이
 * 여럿일 때 나머지가 지워졌고, 도형 크기가 곧 색 면적이라 경기도의 주의 한 건이 서울의 위험보다
 * 넓게 칠해졌다 — 면적이 심각도로 읽혔다.
 *
 * 지금은 면이 **사업장 수의 농도**를 말하고 상태는 **핀**이 말한다. 두 축이 갈라져 서로를
 * 지우지 않으며, 지도 전체가 한 계열이라 그 위의 상태색 핀이 눈에 먼저 든다.
 *
 * 농도 단은 4개다(0 · 1 · 2 · 3+). 그보다 촘촘히 나누면 인접한 두 단이 구분되지 않는다.
 */
const DENSITY_STEPS = [0, 1, 2, 3] as const;

function densityStep(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

/** 그라데이션 id는 문서 전역이다 — 한 화면에 지도가 둘 놓여도 서로를 덮지 않게 접두사를 받는다 */
function fillId(prefix: string, step: number, active: boolean): string {
  return `${prefix}-fill-${step}${active ? '-on' : ''}`;
}

/** 마커 몸통의 등급별 그라데이션. 두절은 등급이 아니라 수신 상태라 따로 둔다 */
function pinFillId(prefix: string, level: StatusLevel | null): string {
  return `${prefix}-pin-${level ?? 'missing'}`;
}

export function SiteMap({
  sites,
  selectedId,
  onSelect,
  municipality,
  siteChosen = false,
}: SiteMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  /**
   * **관할 모드는 그 관할이 속한 시도 한 장만 그린다** `[사용자 결정 2026-08-26]`.
   *
   * 시도는 넘어온 사업장에서 읽는다 — 목록이 이미 관내로 좁혀져 있어(`useScopedSites`)
   * 그 안의 어느 사업장을 봐도 같은 시도다. 별도 매핑 표를 두면 두 곳이 갈릴 수 있다.
   *
   * **전국 지도로 떨어뜨리지 않는다** — 관할 밖 사업장이 보이는 것이 이 역할에서는
   * 그리기 문제가 아니라 범위 문제다.
   */
  const govProvince = municipality ? (sites[0]?.province ?? null) : null;
  const region = municipality && govProvince ? { name: municipality, province: govProvince } : null;
  /* 관내에 사업장이 없으면 어느 시도를 그릴지 알 수 없다 — 부르는 쪽이 빈 상태를 그린다 */
  const missingShape = municipality !== undefined && region === null;
  const shapes: MapShape[] = region
    ? PROVINCE_SHAPES.filter((p) => p.name === region.province)
    : PROVINCE_SHAPES;
  /*
   * **관할 모드는 뷰박스 세로를 잘라낸다.** 전국 뷰박스는 세로로 긴 상자라 시도 하나를
   * 넣으면 위아래가 비고 확대가 가로에서 막힌다 — 가로는 그대로 두고 세로만 줄이면
   * 도형·핀·라벨이 같은 비율로 함께 커진다(§`singleProvinceView`) — 확대해서 보는 중이니
   * 그것이 맞다. **툴팁만 예외다**: 지도 위에 얹힌 판이라 아래에서 되돌린다.
   */
  const view: Rect = region ? singleProvinceView(region.province) : PROVINCE_VIEWBOX;
  const viewBox = `${view.x} ${view.y} ${view.width} ${view.height}`;
  /*
   * 뷰박스를 잘라내면 그 안의 것이 화면에서 함께 커진다. 도형·핀·라벨은 그래야 맞고
   * **툴팁만 되돌린다** — 지도 위에 얹힌 판이라 축척과 무관하게 같은 크기여야 읽힌다.
   */
  const svgRef = useRef<SVGSVGElement>(null);
  const screenUnit = useScreenUnit(svgRef, viewBox);
  /* 그라데이션·필터 id는 문서 전역이라 지도가 두 곳에 놓여도 겹치지 않게 접두사를 받는다 */
  const gradientPrefix = `map-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  /**
   * **처음 보이는 것은 남한 전체다** `[사용자 지시 2026-08-24]`. 화면에 들어온 순간 어느 한
   * 시도로 확대돼 있으면 나머지 9개소가 화면 밖이라 "전 사업장 관제"가 성립하지 않는다.
   *
   * 그다음부터는 **사업장을 바꿀 때 그 시도로 옮긴다** — 전국 축척에서는 핀 하나의 색만
   * 달라져 어디를 골랐는지 눈으로 찾아야 했다.
   *
   * **«처음»을 마운트 시점에 붙잡지 않는다.** 한때 들어온 순간의 사업장을 `useState`로 들고
   * 그것과 같으면 전국으로 봤는데, **기본 사업장으로 되돌아오는 것**까지 첫 방문으로 읽혔다
   * `[사용자 지적 2026-08-31]` — 다른 곳을 눌렀다가 구미를 다시 누르면 확대가 풀렸다.
   *
   * 고른 적이 있는지는 **주소가 이미 답한다**: 핀이든 탭이든 무엇을 누르면 `?site=`가 박히고
   * 다시 지워지지 않는다. 마운트 값이 아니라 지금 값을 읽으면 새로고침(주소에 남아 있음)과
   * 첫 방문(비어 있음)도 같은 한 줄로 갈린다.
   *
   * **effect로 맞추지 않고 파생시킨다.** 선택이 바뀔 때 `setState`를 부르면 렌더가 한 번 더
   * 돌고 그 사이 한 프레임이 옛 축척이다(린트도 막는다). 들고 있는 것은 **직접 누른 확대**
   * 하나뿐이고, 거기에 **어느 사업장을 보던 중이었는지**를 함께 적어 사업장이 바뀌면 그 기록이
   * 저절로 무효가 된다.
   *
   * 확대는 화면을 보는 방식일 뿐 데이터 조건이 아니라 URL에 담지 않는다.
   */
  const [zoomOverride, setZoomOverride] = useState<{
    province: string | null;
    forSite: string;
  } | null>(null);

  const autoProvince = siteChosen
    ? (sites.find((site) => site.id === selectedId)?.province ?? null)
    : null;
  const focusedProvince =
    zoomOverride && zoomOverride.forSite === selectedId ? zoomOverride.province : autoProvince;
  const setFocusedProvince = (province: string | null) =>
    setZoomOverride({ province, forSite: selectedId });

  /**
   * 가리키는 사업장은 **핀 옆 툴팁**이, 고른 사업장은 **핀 강조와 지도 축척**이 말한다.
   * 한때 지도 아래 카드가 hover까지 따라갔는데, 훑는 동안 카드가 계속 바뀌어 정작 무엇을
   * 골라 두었는지 놓쳤다 — 그 카드는 걷었고 같은 값을 오른쪽 판정 카드가 더 크게 보인다.
   */
  const hoveredSite = hoveredId ? (sites.find((s) => s.id === hoveredId) ?? null) : null;

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

  /**
   * **확대는 이어서 움직인다** `[사용자 지시 2026-08-24]`.
   *
   * 예전에는 그룹의 `transform`에만 CSS 전환을 걸었다. 도형은 미끄러지는데 라벨 글자 크기와
   * 핀 반지름은 `1/k`로 되돌리는 값이라 **그 순간 툭 바뀌었다** — 그래서 화면이 확 바뀌는
   * 것처럼 보였다. 지금은 `{scale, translateX, translateY}` 세 값을 한 번에 보간하고 모든
   * 파생값이 그 결과에서 나온다.
   */
  const target = useMemo(
    /* 관할 모드는 그 시도에 고정한다 — 고를 것이 없으므로 사용자 확대를 받지 않는다 */
    () => provinceFocus(govProvince ?? focusedProvince),
    [focusedProvince, govProvince],
  );
  const focus = useAnimatedFocus(target);
  /** 확대해도 글자와 핀은 화면에서 같은 크기로 남아야 읽힌다 */
  const k = focus.scale;

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
  const outlines = shapes.filter((p) => p.name === focusedProvince || p.name === activeProvince);

  /**
   * 겹친 핀은 나중에 그린 쪽이 위로 온다. 가리키는 핀과 선택한 핀을 뒤로 보내
   * 이웃에 가리지 않게 한다 — 안동 두 곳처럼 붙어 있는 쌍에서 차이가 크다.
   */
  const orderedSites = useMemo(() => {
    const weight = (site: Site) => (site.id === hoveredId ? 2 : site.id === selectedId ? 1 : 0);
    return [...sites].sort((a, b) => weight(a) - weight(b));
  }, [sites, hoveredId, selectedId]);

  /*
   * **도형이 없으면 지도를 그리지 않는다**(R19). 시도 지도로 떨어뜨리면 관할 밖 사업장이
   * 화면에 들어오고, 이 역할에서 그것은 그리기 문제가 아니라 범위 문제다.
   */
  if (missingShape) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center">
        <p className="max-w-[36ch] text-[12px] leading-relaxed text-fg-subtle">
          <strong className="text-fg-muted">{municipality}</strong> 관내에 사업장이 없어 지도를
          그리지 않습니다 — <strong className="text-fg-muted">0개소는 오류가 아닙니다.</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {/*
       * **관할 모드에는 확대 줄이 없다.** 고를 지역이 하나뿐이라 누를 것이 없고,
       * 문구도 `전국`·`시도를 눌러 확대`라 관할 화면에서는 거짓이 된다.
       * 대신 관내 요약 한 줄을 같은 자리에 둔다 — 자리를 비우면 지도가 위로 붙는다.
       */}
      {region ? (
        /*
         * **면은 시도인데 관할은 시·군·구다** — 그 어긋남을 글이 메운다. 이 줄이 없으면
         * 경상북도 전체가 관할로 읽힌다(경북에는 6개소가 있고 관할은 안동 2곳이다).
         */
        <p className="shrink-0 px-1 text-[12px] text-fg-subtle">
          <span className="font-medium text-fg-muted">{region.province}</span>
          <span className="mx-1">·</span>관할 {region.name} 사업장{' '}
          <span className="num">{sites.length}</span>개소
          <span className="ml-1">· 관할 밖 사업장은 표시하지 않습니다</span>
        </p>
      ) : (
        <ProvinceZoomBar
          provinces={shapes.filter((p) => provinceState.has(p.name))}
          focused={focusedProvince}
          onFocus={setFocusedProvince}
          readout={activeProvince ? provinceReadout(activeProvince, provinceState) : null}
        />
      )}

      {/**
       * 폭 기준 분기(lg: 등)만 쓰면 화면이 낮은 모니터에서 패널이 통째로 잘린다 —
       * 실측 1366x768에서 219px이 잘렸다. 그래서 높이를 뷰포트에 매단다.
       *
       * 높이는 **패널이 정하고 지도는 남는 자리를 채운다**(`flex-1 min-h-0`)
       *  `[사용자 지시 2026-08-24]`. 패널이 `h-[90svh]`를 갖고 그 안에서 헤더·확대 줄을
       *  뺀 나머지가 지도다 — 위아래 여백이 패널의 `p-5` 하나로 정해져 똑같아진다.
       *  상한 630은 벤치마크(soosiro)와 맞춘 값이고, 하한 400은 그 아래로 줄면 시도 라벨이
       *  8px 밑으로 내려가 읽히지 않기 때문이다.
       * 상한 630은 벤치마크(soosiro)와 맞춘 값이고, 하한 400은 그 아래로 줄면
       * 시도 라벨이 8px 밑으로 내려가 읽히지 않기 때문이다 — 라벨은 뷰박스 단위라
       * 지도와 함께 작아진다.
       *
       * svh를 쓴다 — 모바일에서 주소창이 접힐 때 dvh처럼 높이가 출렁이지 않는다.
       * 계산이 CSS 안에서 끝나므로 렌더 중 window를 읽지 않는다(hydration 안전).
       */}
      {/*
       * **지도 칸의 높이는 이 상자가 정하고 svg는 그 안을 채운다** `[사용자 지시 2026-08-24: 지도가
       * 컨테이너 밖으로 삐져나온다]`.
       *
       * 예전에는 svg가 직접 `flex-1 min-h-[400px]`을 들었다. 카드 높이가 뷰포트에 매달려 있어
       * 남는 자리가 400px보다 작아지는 순간(짧은 화면·탭 줄이 붙어 카드가 24px 더 줄어든 뒤)
       * **최소 높이가 이겨 카드 밖으로 밀려 나왔다** — 고정 높이 카드 안에 바닥값을 두면 넘칠 수밖에 없다.
       *
       * 지금은 상자가 남는 높이를 받고(`flex-1 min-h-0`) svg는 `h-full`로 그 안을 채운다.
       * `preserveAspectRatio` 기본값이 뷰박스를 상자 안에 **맞춰 넣으므로**(meet) 도형이 상자보다
       * 커지는 경우가 없다. 바닥값은 카드 높이가 자동인 구간(`xl` 미만)에만 남긴다 — 그쪽은
       * 카드가 내용만큼 늘어나므로 넘치지 않고, 없으면 `flex-1`이 0으로 접혀 지도가 사라진다.
       */}
      <div className="min-h-[320px] flex-1 xl:min-h-0">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          /* 확대한 그룹과 그림자가 뷰박스 밖으로 나가는 것을 여기서 자른다 */
          className="mx-auto block h-full max-h-[630px] w-full max-w-[510px] overflow-hidden"
          role="img"
          /* 관할 모드에는 면 농도 축이 없다 — 도형이 하나라 견줄 대상이 없어 그 말이 거짓이 된다 */
          aria-label={
            region
              ? `${region.province} 안의 관할 ${region.name} 사업장 ${sites.length}개소 위치. 관할 밖 사업장은 표시하지 않습니다. 핀 색이 상태 등급입니다.`
              : `실증 사업장 ${sites.length}개소 위치. 시도 면의 농도는 그 지역의 사업장 수이고, 핀 색이 상태 등급입니다.`
          }
          onMouseLeave={() => setHoveredProvince(null)}
        >
          <defs>
            {/*
             * **면은 위에서 아래로 흐르는 블루 그라데이션이다** `[사용자 지시 2026-08-24]`.
             * 단마다 두 벌을 만든다 — 평소(옅음)와 가리킴·확대(한 단 진함).
             * 위쪽이 진하고 아래가 옅어 도형이 살짝 부풀어 보인다(3D 층과 함께 읽힌다).
             */}
            {DENSITY_STEPS.map((step) =>
              [false, true].map((active) => {
                const top = step === 0 ? 6 : 14 + step * 12 + (active ? 10 : 0);
                const bottom = step === 0 ? 2 : 6 + step * 8 + (active ? 8 : 0);
                return (
                  <linearGradient
                    key={fillId(gradientPrefix, step, active)}
                    id={fillId(gradientPrefix, step, active)}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={`color-mix(in srgb, var(--accent) ${top}%, var(--surface))`}
                    />
                    <stop
                      offset="100%"
                      stopColor={`color-mix(in srgb, var(--accent) ${bottom}%, var(--surface))`}
                    />
                  </linearGradient>
                );
              }),
            )}

          {/*
           * 마커 몸통은 **위가 밝고 아래가 등급색 그대로**다 — 빛이 위에서 오는 것으로 읽혀
           * 물방울이 볼록해 보인다. 밝은 쪽을 흰색이 아니라 `--surface`로 섞어 다크에서도
           * 같은 방향(면에 가까워짐)으로 흐른다.
           */}
          {[...PROVISIONAL_STATUS_LEVELS, null as StatusLevel | null].map((level) => {
            const hex = level ? STATUS_VISUAL[level].hex : 'var(--missing)';
            return (
              <linearGradient
                key={pinFillId(gradientPrefix, level)}
                id={pinFillId(gradientPrefix, level)}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={`color-mix(in srgb, ${hex} 68%, var(--surface))`} />
                <stop offset="100%" stopColor={hex} />
              </linearGradient>
            );
          })}

          </defs>

          {/**
           * viewBox가 아니라 그룹에 transform을 건다 — viewBox 속성은 CSS로 부드럽게
           * 이어지지 않는다. 전환은 `useAnimatedFocus`가 값으로 만들므로 여기 CSS 전환은 없다.
           */}
          {/*
           * **지도 전체에 그림자 필터를 걸지 않는다** `[사용자 지시 2026-08-24: 검은 네모 삭제]`.
           *
           * `feDropShadow`의 `flood-color`에 `var(--accent)`를 줬는데, 필터 원시요소의 색은
           * **표현 속성으로 치환되지 않는다** — 값이 무효가 되어 초기값(검정)으로 떨어지고
           * 그림자가 필터 영역 전체를 덮어 **지도 뒤에 검은 네모**로 보였다.
           *
           * 색을 리터럴로 바꾸면 고칠 수 있지만 그러지 않는다: 이 그림자가 하던 일(면에서
           * 살짝 띄우기)은 아래 **3D 층**이 이미 하고 있어 두 겹이 필요 없다. 필터는 지도
           * 전체를 오프스크린으로 합성해 확대 전환마다 비용을 치른다.
           */}
          <g
            style={{
              transform: `translate(${focus.translateX}px, ${focus.translateY}px) scale(${k})`,
            }}
          >
            {/*
             * **3D 층** `[사용자 지시 2026-08-24: 첨부 이미지처럼 약간의 입체]`.
             *
             * 같은 도형을 아래로 조금 내려 진한 블루로 깔면 그것이 '측면'이 되어 지도가 판처럼
             * 솟아 보인다. 두께는 `3`(뷰박스 단위)이며 확대해도 배율로 나눠 화면에서 일정하다 —
             * 나누지 않으면 3배 확대에서 9px 두께가 되어 도형이 겹쳐 보인다.
             *
             * 실제 3D 투영(기울이기)은 쓰지 않는다. 지도의 목적은 **어디**를 읽는 것이고,
             * 기울이면 위쪽 시도가 눌려 면적과 거리가 왜곡된다.
             */}
            {shapes.map((province) => (
              <path
                key={`base-${province.name}`}
                d={province.d}
                transform={`translate(0, ${MAP_DEPTH / k})`}
                fill="color-mix(in srgb, var(--accent) 34%, var(--surface))"
                stroke="none"
                className="pointer-events-none"
              />
            ))}

            {shapes.map((province) => (
              <path
                key={province.name}
                d={province.d}
                /* 사업장 없는 시도도 형태는 읽혀야 한다. 패널 배경과 같은 색이면 지도가 사라진다 */
                fill={`url(#${fillId(
                  gradientPrefix,
                  densityStep(provinceState.get(province.name)?.count ?? 0),
                  province.name === activeProvince || province.name === focusedProvince,
                )})`}
                /*
                 * 겉 테두리와 시도 구분선은 **아주 연한 그레이**다 `[사용자 지시 2026-08-24]` —
                 * 흰 선은 블루 면 위에서 도형을 잘라 놓은 것처럼 보였다.
                 *
                 * 두 선을 한 값으로 정하는 이유: 겉 윤곽은 별도 도형이 아니라 이 도형들의 가장
                 * 바깥 변이라 같은 stroke가 그린다. 색을 따로 주려면 8도의 합집합 경로를 따로
                 * 구워야 하는데, 그 선은 지금 지도에서 읽을 것이 없다(바다 쪽은 비어 있다).
                 */
                stroke="var(--border)"
                strokeWidth={0.9}
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
                /* 확대해 둔 곳은 포인트색 실선, 그냥 가리킨 곳은 옅은 잉크 — 두 상태를 색으로 가른다 */
                stroke={province.name === focusedProvince ? 'var(--accent)' : 'var(--fg-muted)'}
                strokeWidth={province.name === focusedProvince ? 2.2 : 1.2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="pointer-events-none"
                opacity={province.name === focusedProvince ? 1 : 0.5}
              />
            ))}

            {shapes.map((province) => {
              const shown =
                /* 관할 모드는 도형이 하나라 늘 이름을 적는다 — 라벨이 없으면 어디인지 알 수 없다 */
                region !== null ||
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
                  fontSize={MAP_LABEL_FONT_SIZE / k}
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
                idPrefix={gradientPrefix}
                selected={site.id === selectedId}
                hovered={site.id === hoveredId}
                scale={k}
                onSelect={onSelect}
                onHover={setHoveredId}
              />
            ))}
          </g>

          {/**
           * 툴팁은 변환 그룹 **밖**에 그린다. 안에 넣으면 확대 배율만큼 상자와 글자가
           * 함께 커져 매번 1/k로 되돌려야 하고, 확대 전환 320ms 동안 상자가 늘어난다.
           * 밖에서 변환 결과 좌표만 받아 그리면 화면 크기가 배율과 무관하게 고정된다.
           */}
          {hoveredSite && (
            <PinTooltip site={hoveredSite} focus={focus} view={view} unit={screenUnit} />
          )}
        </svg>
      </div>
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
  /* 알약은 이 줄에서만 움직인다 */
  const pillId = useId();

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <div role="group" aria-label="지도 확대 지역" className={SEG_TRACK}>
        <ZoomButton active={focused === null} pillId={pillId} onClick={() => onFocus(null)}>
          전국
        </ZoomButton>
        {provinces.map((province) => (
          <ZoomButton
            key={province.name}
            active={focused === province.name}
            pillId={pillId}
            onClick={() => onFocus(province.name)}
          >
            {province.label}
          </ZoomButton>
        ))}
      </div>

      {/**
       * 가리키는 지역의 이름을 지도가 아니라 여기에 적는다. 도형 위에 띄우면
       * 작은 광역시에서는 툴팁이 도형보다 커져 정작 가리킨 곳을 덮는다.
       */}
      <span className="ml-auto truncate text-[12px] text-fg-subtle">
        {readout ?? '시도를 눌러 확대'}
      </span>
    </div>
  );
}

/** 다른 화면의 탭·필터와 **같은 껍데기**를 쓴다 `[사용자 지시 2026-08-24]` — 값은 `segmented-control.tsx` */
function ZoomButton({
  active,
  onClick,
  pillId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  pillId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(SEG_ITEM, 'px-2 py-0.5', active ? SEG_ITEM_ON : SEG_ITEM_OFF)}
    >
      {active && <SegPill layoutId={pillId} />}
      <span className="relative">{children}</span>
    </button>
  );
}

interface SitePinProps {
  site: Site;
  /** 몸통 그라데이션·그림자 id의 접두사. 지도 인스턴스마다 다르다 */
  idPrefix: string;
  selected: boolean;
  hovered: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function SitePin({ site, idPrefix, selected, hovered, scale, onSelect, onHover }: SitePinProps) {
  const [lat, lng] = site.coordinates;
  const { x, y } = projectToMap(lat, lng);
  const level: StatusLevel | null = site.status;
  const visual = level ? STATUS_VISUAL[level] : null;
  const accent = visual ? visual.hex : 'var(--missing)';
  const ink = visual ? visual.ink : 'var(--fg-muted)';
  const label = level
    ? `${site.name} · ${PROVISIONAL_STATUS_LABELS[level]} · 이상 점수 ${site.anomalyScore}`
    : `${site.name} · 통신 두절`;

  /** 누르고 있는 동안만 참. 손을 떼거나 밖으로 나가면 풀린다 */
  const [pressed, setPressed] = useState(false);

  /*
   * **세 상태를 크기와 높이로 가른다** `[사용자 지시 2026-08-24]`.
   *
   *  · 기본   — 크기 1
   *  · 가리킴 — 1.08배 + 지면에서 살짝 **뜬다**(-1.2). 고리를 하나 더 두던 판본은 고른 핀의
   *             고리와 겹쳐 무엇이 선택인지 흐렸다. 뜨는 것만으로도 커서 아래가 어느 핀인지 읽힌다
   *  · 누름   — 0.92배 + 뜨지 않는다. **지면으로 눌리는 것**이 누름의 자연스러운 방향이다
   *  · 고름   — 1.28배 + **진한 그림자**. 고리를 두던 판본은 테두리가 마커의 등급색과 경쟁했다
   *             `[사용자 지시 2026-08-24]` — 크기와 그림자만으로도 하나만 도드라지고,
   *             그림자는 hover의 '뜸'과 달리 **짙고 좁아** 두 상태가 섞이지 않는다
   *
   * 크기는 배율로 나눠 확대해도 화면에서 같다.
   */
  const scaleFactor = (pressed ? 0.92 : selected ? 1.28 : hovered ? 1.08 : 1) / scale;
  const lift = hovered && !pressed ? -1.2 / scale : 0;

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
      onMouseLeave={() => {
        setPressed(false);
        onHover(null);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => onHover(site.id)}
      onBlur={() => onHover(null)}
    >
      {/*
       * **물방울 모양 마커** `[사용자 지시 2026-08-24: 첨부 이미지 래퍼런스]`.
       *
       * 겹치는 층이 각자 하는 일이 다르다:
       *  ① 바닥 그림자 — 마커가 지면에서 떠 있게 만든다(좌표는 뾰족한 끝이 짚는다)
       *  ② 몸통 — 등급색 그라데이션(위가 밝다. 빛이 위에서 온다)
       *  ③ 흰 테 — 어떤 시도 면 위에 놓여도 몸통이 잘려 보이지 않게 가른다
       *  ④ 안쪽 그림자 — 머리 아래쪽을 눌러 몸통이 볼록해 보인다
       *  ⑤ 흰 눈 + 등급색 점 — 래퍼런스의 흰 아이콘 자리
       *
       * **모든 층이 한 묶음 안에 있다.** 고리를 밖에 두었던 판본은 마커가 뜨거나 눌릴 때
       * 고리만 제자리에 남았다. 좌표계는 마커의 **끝을 원점**으로 잡아, 크기가 바뀌어도
       * 짚는 자리가 움직이지 않는다(머리 중심은 위로 12).
       *
       * 전환을 CSS에 맡긴다 — 상태가 바뀔 때마다 값을 새로 그리지 않고 브라우저가 잇는다.
       * 감속 설정은 전역 CSS가 이 전환을 끈다.
       */}
      {/*
       * 그림자는 **바닥 타원 하나**로 낸다 — `feDropShadow` 필터를 쓰지 않는다.
       * 필터는 핀마다 오프스크린 합성을 만들고(10개), 원시요소의 색이 무효가 되면 검은 네모가
       * 되는 함정이 있다(지도 전체 필터에서 실제로 겪었다). 타원은 그 둘이 없고, 뜰 때
       * 넓어지고 옅어지는 변화까지 값으로 직접 만들 수 있다.
       */}
      <g
        style={{
          transform: `translate(${x}px, ${y + lift}px) scale(${scaleFactor})`,
          transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/*
         * 그림자가 세 상태를 함께 말한다.
         *  · 가리킴(뜸) — 넓고 옅다(높이가 그림자로 읽힌다)
         *  · 고름       — **좁고 짙다**(마커가 지면에 단단히 박힌 것으로 읽힌다)
         *  · 기본       — 그 중간
         *
         * 색이 **토큰이 아닌 리터럴**이다(§8 `토큰 밖 색`). 그림자는 두 테마에서 모두
         * 어두워야 하는데 `--fg`는 다크에서 밝은 값이라 **흰 그림자**가 된다. 농도는
         * `opacity`가 조절하므로 색 자체는 고정해 둔다.
         */}
        <ellipse
          cx={0}
          cy={0.6 - lift * scale}
          rx={hovered && !pressed ? 5.2 : selected ? 4.8 : 4.4}
          ry={selected ? 1.7 : 1.4}
          fill="#101a22"
          opacity={hovered && !pressed ? 0.14 : selected ? 0.34 : 0.2}
        />

        <path
          d={PIN_PATH}
          fill={`url(#${pinFillId(idPrefix, level)})`}
          stroke="var(--surface)"
          /* 테는 몸통을 가르는 선일 뿐이다 — 굵으면 등급색 면이 그만큼 줄어 색이 흐려진다 */
          strokeWidth={1}
          strokeLinejoin="round"
          /* 통신 두절은 채우지 않고 윤곽만 둔다 — 색이 아니라 형태로 '수신 없음'을 구분한다(E4) */
          fillOpacity={visual ? 1 : 0.28}
        />

        {/* 안쪽 그림자. 머리 아래쪽 곡선에만 걸어 위에서 빛을 받는 것처럼 보이게 한다 */}
        <path
          d={PIN_INNER_SHADE}
          fill="none"
          stroke={ink}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.2}
        />

        <circle cx={0} cy={-11.6} r={3.1} fill="var(--surface)" />
        <circle cx={0} cy={-11.6} r={1.5} fill={accent} opacity={visual ? 0.9 : 0.4} />

      </g>

      {/* 작은 도형을 정확히 겨냥하기 어렵다. 머리 쪽에 큰 투명 영역을 둬 잡기 쉽게 한다 */}
      <circle cx={x} cy={y - 8 / scale} r={PIN_HIT_RADIUS / scale} fill="transparent" />
    </g>
  );
}

/**
 * 핀을 가리키는(또는 포커스한) 동안 그 자리에 뜨는 요약.
 *
 * **짧게 적는다** — 사업장명과 "지금 어떤 상태인가" 한 줄이면 지도를 훑는 목적에 충분하다.
 * 주소·가동률처럼 읽는 데 시간이 드는 값은 아래 카드와 오른쪽 상세 패널이 맡는다.
 *
 * 점수에 산출 시각을 덧붙이지 않는다 — 지도 전체가 한 기준 시각의 스냅숏이고 그 시각은
 * 헤더 띠가 이미 적고 있다(E3·E5). 핀마다 되풀이하면 툴팁이 표가 된다.
 */
function PinTooltip({
  site,
  focus,
  view,
  unit,
}: {
  site: Site;
  focus: MapFocus;
  view: Rect;
  /** 화면 1px이 뷰박스 몇 단위인가 — 이 상자는 축척과 무관하게 같은 크기여야 한다 */
  unit: number;
}) {
  const [lat, lng] = site.coordinates;
  const point = projectToMap(lat, lng);
  const level: StatusLevel | null = site.status;
  const visual = level ? STATUS_VISUAL[level] : null;

  const industry = `${site.industry} · `;
  /* 값이 없으면 0으로 채우지 않는다. 두절은 두절이라고 적는다(E4) */
  const state = level ? `${PROVISIONAL_STATUS_LABELS[level]} ${site.anomalyScore}` : '통신 두절';

  /* 상자 안은 **화면 px**으로 그리고 바깥 변환이 뷰박스 단위로 되돌린다(`unit`) */
  const { width, height } = tooltipSize(site.name, industry + state);

  const box = placeTooltip({
    // 그룹 밖이라 변환을 직접 건다 — transform: translate(t) scale(k)
    pinX: focus.translateX + focus.scale * point.x,
    pinY: focus.translateY + focus.scale * point.y,
    /* 자리를 잡는 계산은 뷰박스 좌표에서 돈다 — 잘림 검사가 그 축이다 */
    width: width * unit,
    height: height * unit,
    /*
     * 간격·여백은 되돌리지 않는다. 핀은 뷰박스와 함께 커지므로(그것이 맞다) 간격도 같이
     * 커져야 확대한 지도에서 상자가 핀을 덮지 않는다.
     */
    gap: TOOLTIP_PIN_GAP,
    padding: TOOLTIP_EDGE_PADDING,
    /* 관할 모드는 뷰박스가 다르다 — 고정값을 쓰면 상자가 화면 밖으로 나간다 */
    view,
  });

  const textX = TOOLTIP_PADDING_X;
  const titleY = TOOLTIP_PADDING_Y + TOOLTIP_TITLE_SIZE * 0.82;

  return (
    /*
     * 커서 아래에 들어와도 핀의 hover를 뺏으면 안 된다 — 툴팁이 깜빡인다.
     * 내용은 핀의 aria-label이 이미 전하므로 보조기기에는 숨긴다.
     *
     * 상자를 원점에 그리고 자리는 이 변환이 잡는다 — 안쪽 좌표에 `box.x`를 더하던 판본은
     * `foreignObject`와 두 `<text>`가 각자 같은 덧셈을 되풀이했다.
     *
     * **`scale(unit)`이 안쪽을 화면 px으로 만든다** `[사용자 지적 2026-08-28]`. 안의 상수는
     * 전부 px으로 읽히고, 뷰박스가 어떻게 잘리든 화면에서 같은 크기가 된다 — 관할 지도에서
     * 툴팁만 1.23배로 커져 있던 것이 이 한 줄로 맞는다(`use-screen-unit.ts`).
     */
    <g
      className="pointer-events-none"
      aria-hidden
      transform={`translate(${box.x} ${box.y}) scale(${unit})`}
    >
      {/*
       * **유리면이다** `[사용자 지시 2026-08-24]`. 반투명 흰 면 + 뒤 배경 blur + 옅은 테두리로
       * 지도 도형 위에 얹힌 판이 된다 — 불투명 상자는 그 아래 시도 경계를 통째로 지웠다.
       *
       * `foreignObject`로 감싸는 이유: `backdrop-filter`는 CSS 박스에만 정의된 속성이라
       * SVG 도형에 걸면 브라우저마다 다르게 무시된다. 안에 HTML div를 두면 blur가 확실히 걸리고,
       * blur를 지원하지 않는 곳에서도 반투명 면 + 테두리 + 그림자로 읽힌다.
       *
       * 좌측 색 띠는 걷었다 `[사용자 지시 2026-08-24]` — 등급은 아래 줄의 **라벨 글자와 그
       * 잉크색**이 나른다(E2). 띠까지 두면 같은 사실이 세 번 있었다.
       */}
      <foreignObject x={0} y={0} width={width} height={height}>
        <div
          className="h-full w-full rounded-[5px] border border-border bg-surface/70 shadow-panel backdrop-blur-md"
          style={{ boxSizing: 'border-box' }}
        />
      </foreignObject>

      <text
        x={textX}
        y={titleY}
        fontSize={TOOLTIP_TITLE_SIZE}
        fontWeight={600}
        fill="var(--fg)"
        className="select-none"
      >
        {site.name}
      </text>

      <text
        x={textX}
        y={titleY + TOOLTIP_LINE_GAP + TOOLTIP_DETAIL_SIZE}
        fontSize={TOOLTIP_DETAIL_SIZE}
        className="select-none"
      >
        <tspan fill="var(--fg-subtle)">{industry}</tspan>
        <tspan fill={visual ? visual.ink : 'var(--fg-subtle)'} fontWeight={600}>
          {state}
        </tspan>
      </text>
    </g>
  );
}
