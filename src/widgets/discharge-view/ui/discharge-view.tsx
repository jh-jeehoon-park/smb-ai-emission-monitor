'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COLLECTION_INTERVAL_MINUTES, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import {
  ACTUAL_HEX,
  AXIS_TEXT_HEX,
  GRID_HEX,
  IDLE_BAND,
  MISSING_HEX,
  OUTAGE_BAND,
} from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { DISPLAY_TIMEZONE, formatClock, formatDateTime, formatValue } from '@/shared/lib/format';
import { getOutageWindow, isDischargingAt } from '@/shared/lib/timeline';
import { CHART_SURFACE, ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { Panel } from '@/shared/ui/panel';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';
import {
  StatTile,
  TILE_FOOTER,
  TILE_LABEL,
  TILE_SHELL,
  TILE_VALUE,
} from '@/shared/ui/stat-tile';
import { InfoTip } from '@/shared/ui/tooltip';
import { useChartHover } from '@/shared/lib/use-chart-hover';
import { getSite } from '@/entities/site';
import {
  TELEMETRY_PENDING_NOTE,
  dailyDischargeSeries,
  dailyDischargeVolume,
  useSiteSeries,
  type CumulativePoint,
  type MeasurementPoint,
} from '@/entities/measurement';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  currentRun,
  idleBands,
  type DischargeBand,
  type DischargeSample,
} from '../lib/discharge-runs';
import {
  FLOW_CHART_HEIGHT,
  SIDE_CHART_HEIGHT,
  TILE_LABELS,
  VOLUME_DECIMALS,
} from '../config/constants';

const LEVEL = MEASUREMENT_ITEMS.level;
const FLOW = MEASUREMENT_ITEMS.flow;

/**
 * **금일 배출 현황** (`SCR-OP-011`).
 *
 * `[원문 p.1]`이 수집 데이터를 네 대분류로 나누고 그중 **배출 데이터**를 `유량 · 수위 ·
 * 방류 여부` 3종으로 규정하며, 활용 목적을 *"배출량 및 부하량 산정 기반 데이터"* 라 적는다.
 * 나머지 세 대분류는 각자 화면이 있는데(수질→계측 격자, 설비→설비 이상 탐지, 운영 패턴→
 * 리본·리포트) **배출만 흩어져 있었다** — 유량은 격자 한 칸, 방류 여부는 리본 한 줄, 수위는
 * 아예 없었다. 이 화면이 그 묶음을 한 자리에 모은다 `[사용자 요청 2026-08-28]`.
 *
 * **사업장 1개소 축이다.** 어느 역할이든 고른 한 곳의 배출을 본다.
 */
export function DischargeView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);

  /*
   * **계측은 `useSiteSeries` 하나로 들어온다** `[사용자 지적 2026-09-01]`.
   *
   * 이 화면만 `getMeasurementSeries`(fixture)를 직접 읽고 있었다 — 8월 28일에 만들어져
   * 8월 27일에 멈춘 계측 연동 브랜치가 옮겨 줄 수 없었고, 병합에서도 충돌이 나지 않아
   * 조용히 지나갔다. 그 사이 헤더는 `계측 서버 수신 중`이라 적는데 이 화면의 숫자만 내장
   * 데이터였고, 서버에 없는 수위가 값으로 뜨는 것이 그 증거였다(**E3** — 산출값은 원천을
   * 밝힌다).
   */
  const {
    points: series,
    discharging: liveDischarging,
    observedAtIso,
    unreceived,
    status: seriesStatus,
  } = useSiteSeries(siteId);
  /*
   * **아직 못 받은 것을 «두절»이라 적지 않는다** `[사용자 지적 2026-09-07]`.
   *
   * 이 화면은 타일 넷과 차트 셋이 전부 계측이라, 첫 응답 전 빈 계열이 그대로 흘러
   * **없는 두절을 네 번 주장했다** — 차트 셋이 `통신 두절 — 수신 없음`, 방류 상태 타일이
   * `통신이 두절되어 방류 여부를 확인할 수 없습니다`. 셋 다 **확인된 부재**의 어휘다(**E4**).
   */
  const pending = seriesStatus === 'pending';
  /*
   * **채널이 없는 것과 통신이 끊긴 것은 다른 사실이다.** 둘 다 `null`로 오지만 화면이
   * 같은 말을 하면 안 된다 — 수위는 서버에 채널 자체가 없어서 비고(`[TBD-57]`, 추가 요청
   * 중), 두절은 있던 값이 끊긴 것이다. `수신 없음` 하나로 뭉치면 없는 두절을 주장한다(E4).
   */
  const levelUnreceived = unreceived.includes('level');

  const detail = useMemo(() => {
    /*
     * 방류 여부는 **서버에 닿으면 서버 값**, fixture면 시뮬레이션이다. 훅의 계약이 그렇다 —
     * `discharging`은 서버에서 받을 때만 값이 있고 fixture 경로에서는 `null`이다.
     */
    const samples: DischargeSample[] = series.map((point, i) => ({
      t: point.t,
      discharging: liveDischarging ? (liveDischarging[i] ?? null) : isDischargingAt(siteId, i),
    }));

    return {
      series,
      samples,
      /*
       * 자정 이후만 그린다 — `금일`이라 이름 붙인 값이 어제를 담으면 안 된다.
       * **기준 날짜는 계열의 끝에서 읽는다**(`observedAtIso`) — `DEMO_NOW_ISO`로 자르면
       * 서버에서 받을 때 오늘이 아니라 시연 날짜로 잘라 전 구간이 비거나 어제가 섞인다.
       */
      today: series.filter((point) => point.t >= `${observedAtIso.slice(0, 10)}T00:00:00Z`),
      volume: dailyDischargeVolume(series),
      cumulative: dailyDischargeSeries(series),
      run: currentRun(samples),
      bands: idleBands(samples),
      outage: getOutageWindow(siteId),
      latestFlow: [...series].reverse().find((p) => p.flow !== null)?.flow ?? null,
      latestLevel: [...series].reverse().find((p) => p.level !== null)?.level ?? null,
    };
  }, [siteId, series, liveDischarging, observedAtIso]);

  const { run, volume } = detail;
  const chart: ChartInput = {
    today: detail.today,
    bands: detail.bands,
    outage: detail.outage,
    siteName: site.name,
  };
  const runLabel =
    run.discharging === null ? '수신 없음' : run.discharging ? '방류 중' : '방류 중단';

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/*
         * **네 값이 원문의 한 묶음이다.** 순서는 읽는 차례다 — 내보내고 있나(상태) →
         * 얼마나(유량) → 수조는(수위) → 오늘 합쳐서(누적).
         */}
        {pending ? (
          TILE_LABELS.map((label) => <PendingTile key={label} label={label} />)
        ) : (
          <>
            <StatTile
              label="방류 상태"
              value={runLabel}
              /*
               * **창 전체가 같은 상태면 `~부터`라 적지 않는다.** 그 시작점은 24시간 전이라
               * 시:분만 적으면 어제 시각을 오늘처럼 말하고, 언제 시작됐는지는 창 밖이라 모른다.
               */
              note={
                run.minutes === null
                  ? '통신이 두절되어 방류 여부를 확인할 수 없습니다'
                  : run.fromWindowStart
                    ? `조회한 ${runMinutesLabel(run.minutes)} 내내 · 그 전은 조회 범위 밖입니다`
                    : `${formatClock(run.sinceIso!)} ${DISPLAY_TIMEZONE}부터 · ${runMinutesLabel(run.minutes)}째`
              }
            />
            <StatTile
              label="실시간 배출 유량"
              value={detail.latestFlow === null ? '수신 없음' : formatValue('flow', detail.latestFlow)}
              note={detail.latestFlow === null ? '마지막 수신 없음' : `${FLOW.unit} · ${FLOW.unitKo}`}
            />
            <StatTile
              label={LEVEL.label}
              value={
                detail.latestLevel === null ? '수신 없음' : formatValue('level', detail.latestLevel)
              }
              note={
                detail.latestLevel !== null
                  ? `${LEVEL.unit} · 만수위 ${LEVEL.range[1]}${LEVEL.unit} [PROVISIONAL]`
                  : levelUnreceived
                    ? '계측 서버에 수위 채널이 없습니다 [TBD-57]'
                    : '마지막 수신 없음'
              }
            />
            <StatTile
              label="금일 누적 배출량"
              value={volume.volumeM3 === null ? '수신 없음' : volume.volumeM3.toFixed(VOLUME_DECIMALS)}
              note={
                volume.volumeM3 === null
                  ? '센 표본이 없습니다 — 0이 아니라 모릅니다'
                  : `m³ · 세제곱미터${volume.missing > 0 ? ` · 결측 ${volume.missing}건 제외` : ''}`
              }
            />
          </>
        )}
      </div>

      <Panel
        title={`금일 배출 흐름 · ${site.name}`}
        titleAside={
          <InfoTip
            label="이 그래프를 읽는 법"
            /*
             * **구간을 아직 모르면 적지 않는다.** `volume.fromIso`는 계열의 마지막 표본에서
             * 오므로 첫 응답 전에는 빈 문자열이고, `formatDateTime('')`은 `NaN-NaN-NaN`을
             * 돌려준다 — 툴팁을 열어 본 사람에게 고장으로 보인다.
             */
            content={`자정부터 지금까지의 유출 유량입니다. ${
              pending
                ? TELEMETRY_PENDING_NOTE
                : `${formatDateTime(volume.fromIso)}–${formatDateTime(volume.toIso)} ${DISPLAY_TIMEZONE}`
            } · ${COLLECTION_INTERVAL_MINUTES}분 주기. 옅은 띠는 방류를 멈춘 구간이고 그때 유량은 0입니다 — 값을 못 받은 것이 아니라 받은 값이 0입니다. 통신이 끊긴 구간은 더 진한 띠로 표시하고 선을 끊습니다.`}
          />
        }
      >
        {pending ? <ChartSkeleton height={FLOW_CHART_HEIGHT} /> : <FlowChart input={chart} />}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="금일 누적 배출량"
          titleAside={
            <InfoTip
              label="이 값을 내는 계산"
              content={`유량이 m³/day라 표본마다 ${COLLECTION_INTERVAL_MINUTES}분치 몫(유량 × ${COLLECTION_INTERVAL_MINUTES}/1440)을 더합니다. 자정부터 셉니다 — 시연 시간축은 24시간 창이라 자르지 않으면 어제가 섞입니다. 결측 표본은 빼고 그 건수를 위 타일에 적습니다(0으로 채우면 «그동안 안 내보냈다»는 사실 주장이 됩니다). 방류를 멈춘 구간은 유량이 0이라 계단이 평평해집니다.`}
            />
          }
        >
          {pending ? (
            <ChartSkeleton height={SIDE_CHART_HEIGHT} />
          ) : (
            <CumulativeChart rows={detail.cumulative} />
          )}
        </Panel>

        <Panel
          title={LEVEL.label}
          titleAside={
            <InfoTip
              label="이 값의 출처"
              content={`수위는 원문의 «배출 데이터» 3종 중 하나입니다 [원문 p.1]. 다만 단위·범위·측정 방식이 원문에 없어 [TBD-57] 시연에서는 미터로 표기하고 만수위를 ${LEVEL.range[1]}${LEVEL.unit}로 두었습니다 — 확정되면 이 값만 바뀝니다. 방류를 멈추면 처리수가 계속 들어와 차오르고, 재개하면 빠집니다.`}
            />
          }
        >
          {pending ? (
            <ChartSkeleton height={SIDE_CHART_HEIGHT} />
          ) : (
            <LevelChart input={chart} unreceived={levelUnreceived} />
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * 아직 모르는 타일. **제목만 그리고 값·보조줄을 덮는다** `[사용자 지적 2026-09-07]`.
 *
 * 제목은 계측이 아니라 이 화면이 아는 것이라 기다릴 이유가 없다 — 격자 스켈레톤이 기호와
 * 항목 이름을 그리는 것과 같은 규칙이다. 골격은 실제 타일과 같은 클래스를 쓴다(`TILE_*`).
 *
 * **문구를 네 번 반복하지 않는다.** 셸 헤더가 이미 `수신 확인 중`을 적고 있고, 같은 말을
 * 타일마다 쓰면 그 줄이 값이 아니라 소음이 된다.
 */
function PendingTile({ label }: { label: string }) {
  return (
    <SkeletonRegion label={`${label} — ${TELEMETRY_PENDING_NOTE}`} className={TILE_SHELL}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('min-w-0', TILE_LABEL)}>{label}</p>
        {/*
         * **높이를 글자로 적지 않는다.** 막대를 실제 값과 **같은 요소 안**에 넣어 그 요소의
         * 단(`TILE_VALUE`)이 높이를 정하게 한다 — `1em`은 그 단의 글자 크기다. 픽셀을 박으면
         * 단이 바뀔 때 한쪽만 남아 값이 도착할 때 타일이 튄다(실제로 6px 어긋나 있었다).
         */}
        <p className={`num ${TILE_VALUE}`}>
          <Skeleton className="h-[1em] w-20" />
        </p>
      </div>
      <div className={TILE_FOOTER}>
        {/* 글자 흐름 안에 둔다 — 보조줄의 줄 높이를 그대로 물려받는다 */}
        <Skeleton className="inline-block h-3 w-32 align-middle" />
      </div>
    </SkeletonRegion>
  );
}

/**
 * 아직 모르는 차트. **축을 그리지 않는다** — 값 없는 축에 시각·눈금을 적으면 그 자리의
 * 값이 있는 것처럼 보인다. 높이는 실제 차트와 같은 상수에서 읽는다.
 */
function ChartSkeleton({ height }: { height: number }) {
  return (
    <SkeletonRegion label={TELEMETRY_PENDING_NOTE} className={CHART_SURFACE}>
      <Skeleton style={{ height }} />
    </SkeletonRegion>
  );
}

/** `120분째`보다 `2시간째`가 읽힌다. 한 시간 미만은 분으로 둔다 */
function runMinutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

/**
 * **그릴 값이 하나도 없으면 빈 축을 그리지 않는다**(**R19**·**E4**).
 *
 * 완전히 두절된 사업장은 `getOutageWindow`가 `null`을 돌려주므로(그 함수는 *잠시* 끊긴
 * 구간을 위한 것이다) **두절 띠조차 그려지지 않는다** — 축만 남은 빈 차트가 되어 값이 없다는
 * 사실을 화면이 말하지 않는다. 그 자리를 글로 채운다 `[사용자 요청 2026-08-28]`.
 *
 * `forecast-chart`의 `ForecastEmpty`와 같은 형태이되 문구가 다르다 — 그쪽은 «수신·산출 없음»
 * 이고 여기는 산출한 것이 없으므로 수신만 말한다.
 *
 * **왜 비었는지를 부르는 쪽이 준다** `[사용자 지적 2026-09-01]`. 기본은 두절이지만 수위는
 * **서버에 채널 자체가 없어서** 비는데(`[TBD-57]`), 그것을 «통신 두절»이라 적으면 없는
 * 두절을 주장한다 — 위 타일과 같은 구분이다(E4).
 */
function ChartEmpty({ height, reason }: { height: number; reason?: string }) {
  return (
    <div
      className="flex items-center justify-center border-y border-border text-[12px] text-fg-subtle"
      style={{ height }}
    >
      {reason ?? '통신 두절 — 수신 없음'}
    </div>
  );
}

/** 차트 셋이 함께 쓰는 것만 담는다 — 각자 필요한 것을 따로 받으면 인자가 길어진다 */
interface ChartInput {
  today: MeasurementPoint[];
  bands: DischargeBand[];
  outage: { fromIso: string; toIso: string } | null;
  siteName: string;
}

function Bands({ input }: { input: ChartInput }) {
  return (
    <>
      {/* 멈춘 구간과 못 본 구간은 다르다 — 색을 갈라 놓는다(E4) */}
      {input.bands.map((band) => (
        <ReferenceArea
          key={band.fromIso}
          x1={band.fromIso}
          x2={band.toIso}
          fill={IDLE_BAND}
          stroke="none"
        />
      ))}
      {input.outage && (
        <ReferenceArea
          x1={input.outage.fromIso}
          x2={input.outage.toIso}
          fill={OUTAGE_BAND}
          stroke="none"
        />
      )}
    </>
  );
}

function FlowChart({ input }: { input: ChartInput }) {
  const { hoverProps, tooltipActive } = useChartHover();
  const empty = input.today.every((p) => p.flow === null);

  return (
    <ChartFigure
      label={`${input.siteName} 금일 유출 유량, 단위 ${FLOW.unit} ${FLOW.unitKo}, ${DISPLAY_TIMEZONE} 기준. 옅은 띠는 방류를 멈춘 구간입니다`}
      rows={input.today}
      columns={[
        { header: `시각(${DISPLAY_TIMEZONE})`, cell: (r) => formatClock(r.t) },
        {
          header: `유출 유량(${FLOW.unit})`,
          cell: (r) => (r.flow === null ? '수신 없음' : formatValue('flow', r.flow)),
        },
      ]}
      sampleEvery={12}
    >
      {empty ? (
        <ChartEmpty height={FLOW_CHART_HEIGHT} />
      ) : (
        <div style={{ height: FLOW_CHART_HEIGHT }} {...hoverProps}>
          <ResponsiveContainer width="100%" height="100%">
            {/*
             * `accessibilityLayer={false}` — **툴팁이 화면에 얼어붙는 것을 막는다.**
             * 켜 두면 Recharts가 SVG에 `tabindex="0"`을 붙여 포커스만으로 툴팁을 띄운 뒤
             * 고정한다. 키보드·보조기술 경로는 `ChartFigure`의 라벨과 `표로 보기`가 맡는다.
             */}
            <AreaChart
              data={input.today}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <defs>
                <linearGradient id="discharge-flow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={ACTUAL_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Bands input={input} />
              <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={formatClock}
                minTickGap={56}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_HEX }}
              />
              {/* 0을 바닥에 붙인다 — 방류를 멈춘 구간이 바닥에 닿아야 «멈췄다»로 읽힌다 */}
              <YAxis
                domain={[0, 'dataMax']}
                width={44}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                active={tooltipActive}
                cursor={{ stroke: GRID_HEX, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as MeasurementPoint | undefined;
                  if (!row) return null;
                  return (
                    <ChartTooltipShell label={`${formatClock(row.t)} ${DISPLAY_TIMEZONE}`}>
                      <ChartTooltipRow
                        color={row.flow === null ? MISSING_HEX : ACTUAL_HEX}
                        name="유출 유량"
                        value={
                          row.flow === null
                            ? '수신 없음'
                            : `${formatValue('flow', row.flow)} ${FLOW.unit}`
                        }
                      />
                    </ChartTooltipShell>
                  );
                }}
              />
              {/* 결측은 끊는다 — 0으로 이으면 «안 내보냈다»가 된다(E4) */}
              <Area
                type="monotone"
                dataKey="flow"
                stroke={ACTUAL_HEX}
                strokeWidth={2.5}
                fill="url(#discharge-flow)"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFigure>
  );
}

function CumulativeChart({ rows }: { rows: CumulativePoint[] }) {
  const { hoverProps, tooltipActive } = useChartHover();
  const empty = rows.every((r) => r.m3 === null);

  return (
    <ChartFigure
      label={`금일 누적 배출량, 단위 m³ 세제곱미터, ${DISPLAY_TIMEZONE} 기준. 자정부터 더한 값입니다`}
      rows={rows}
      columns={[
        { header: `시각(${DISPLAY_TIMEZONE})`, cell: (r) => formatClock(r.t) },
        {
          header: '누적(m³)',
          cell: (r) => (r.m3 === null ? '수신 없음' : r.m3.toFixed(VOLUME_DECIMALS)),
        },
      ]}
      sampleEvery={12}
    >
      {empty ? (
        <ChartEmpty height={SIDE_CHART_HEIGHT} />
      ) : (
        <div style={{ height: SIDE_CHART_HEIGHT }} {...hoverProps}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rows}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <defs>
                <linearGradient id="discharge-cumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={ACTUAL_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={formatClock}
                minTickGap={56}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_HEX }}
              />
              <YAxis
                domain={[0, 'dataMax']}
                /*
                 * **축 눈금을 반올림한다** `[사용자 지적 2026-09-01]`. `dataMax`를 그대로 쓰면
                 * 마지막 눈금이 원값이라 `220.19722222222262`처럼 나온다 — 누적은 표본마다
                 * 유량×주기를 더한 실수다. 화면의 다른 차트는 모두 눈금을 반올림한다.
                 * 자릿수는 타일·표와 같은 `VOLUME_DECIMALS`를 쓴다(E1).
                 */
                tickFormatter={(v: number) => v.toFixed(VOLUME_DECIMALS)}
                width={44}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                active={tooltipActive}
                cursor={{ stroke: GRID_HEX, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as CumulativePoint | undefined;
                  if (!row) return null;
                  return (
                    <ChartTooltipShell label={`${formatClock(row.t)} ${DISPLAY_TIMEZONE}`}>
                      <ChartTooltipRow
                        color={row.m3 === null ? MISSING_HEX : ACTUAL_HEX}
                        name="누적 배출량"
                        value={
                          row.m3 === null ? '수신 없음' : `${row.m3.toFixed(VOLUME_DECIMALS)} m³`
                        }
                      />
                    </ChartTooltipShell>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="m3"
                stroke={ACTUAL_HEX}
                strokeWidth={2.5}
                fill="url(#discharge-cumulative)"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFigure>
  );
}

function LevelChart({ input, unreceived }: { input: ChartInput; unreceived: boolean }) {
  const { hoverProps, tooltipActive } = useChartHover();
  const empty = input.today.every((p) => p.level === null);

  return (
    <ChartFigure
      label={`${LEVEL.label} 금일 추이, 단위 ${LEVEL.unit} ${LEVEL.unitKo}, ${DISPLAY_TIMEZONE} 기준`}
      rows={input.today}
      columns={[
        { header: `시각(${DISPLAY_TIMEZONE})`, cell: (r) => formatClock(r.t) },
        {
          header: `수위(${LEVEL.unit})`,
          cell: (r) => (r.level === null ? '수신 없음' : formatValue('level', r.level)),
        },
      ]}
      sampleEvery={12}
    >
      {empty ? (
        /*
         * **«채널이 없다»가 아니라 «값이 오지 않았다»다** `[사용자 확인 2026-09-07]`.
         *
         * 백엔드에 요청해 둔 수위 채널이 도착해 10개소 전부에서 값이 온다 — 이제 이 자리가
         * 뜨는 것은 상시 제약이 아니라 **그 순간의 미수신**이다. 옛 문구는 `[TBD-57]`을 달아
         * 영구 한계처럼 읽혔는데, 그 번호는 단위·만수위 **사양**이 미정이라는 뜻이고
         * 그것은 지금도 그대로다(`PROVISIONAL_LEVEL_*`) — 채널 부재와 다른 사안이다.
         */
        <ChartEmpty
          height={SIDE_CHART_HEIGHT}
          reason={unreceived ? '수위 값이 한 점도 오지 않았습니다' : undefined}
        />
      ) : (
        <div style={{ height: SIDE_CHART_HEIGHT }} {...hoverProps}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={input.today}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <defs>
                <linearGradient id="discharge-level" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={ACTUAL_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Bands input={input} />
              <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={formatClock}
                minTickGap={56}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_HEX }}
              />
              {/* 축을 만수위로 고정한다 — 사업장이 달라도 «얼마나 찼나»가 같은 눈금에서 읽힌다 */}
              <YAxis
                domain={LEVEL.range}
                width={44}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                active={tooltipActive}
                cursor={{ stroke: GRID_HEX, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as MeasurementPoint | undefined;
                  if (!row) return null;
                  return (
                    <ChartTooltipShell label={`${formatClock(row.t)} ${DISPLAY_TIMEZONE}`}>
                      <ChartTooltipRow
                        color={row.level === null ? MISSING_HEX : ACTUAL_HEX}
                        name={LEVEL.label}
                        value={
                          row.level === null
                            ? '수신 없음'
                            : `${formatValue('level', row.level)} ${LEVEL.unit}`
                        }
                      />
                    </ChartTooltipShell>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="level"
                stroke={ACTUAL_HEX}
                strokeWidth={2.5}
                fill="url(#discharge-level)"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFigure>
  );
}
