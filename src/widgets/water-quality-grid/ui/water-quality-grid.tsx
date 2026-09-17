'use client';

import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import {
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import {
  ACTUAL_HEX,
  GRID_HEX,
  MISSING_HEX,
  STATUS_VISUAL,
  statusInk,
} from '@/shared/config/status-visual';
import { formatClock, formatValue } from '@/shared/lib/format';
import { LiveValue } from '@/shared/ui/live-value';
import { BADGE_BASE } from '@/shared/ui/badge';
import { VALUE_MD } from '@/shared/ui/type-scale';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import {
  countOverLimit,
  isSeriesCode,
  type MeasurementPoint,
  type SeriesCode,
  isReceptionStalled,
  useSiteLatest,
} from '@/entities/measurement';
import { SPARK_MARGIN } from '../config/constants';
import { thinForCode } from '../lib/thin-series';
import { WaterQualityGridSkeleton } from './water-quality-grid-skeleton';
import { limitZone, type LimitZone } from '../lib/limit-zone';
import { useChartSurface } from '@/shared/lib/use-chart-hover';

/**
 * 격자 한 묶음. **제목이 없으면 소절을 만들지 않는다** — 묶음이 하나뿐인 화면에서
 * 제목을 강제하면 격자 위에 쓸모없는 이름표가 하나 생긴다.
 */
export interface GridSection {
  title?: string;
  codes: MeasurementItemCode[];
  /**
   * 두 항목의 **차**를 칸 하나로 더 낸다.
   *
   * 유입과 유출에 쓴다 — 두 값을 나란히 두는 목적이 그 차이이고, 사람이 매번 빼게 하면
   * 정작 봐야 할 것을 안 본다. 증발·슬러지로 설명되는 범위를 벗어나면(차가 음수, 즉 나간
   * 양이 들어온 양을 넘으면) 처리 없이 내보낸 정황이다 `[TBD-46]`.
   */
  diff?: { of: [SeriesCode, SeriesCode]; label: string };
}

interface WaterQualityGridProps {
  data: MeasurementPoint[];
  /**
   * **«지금 값»을 그 사업장 주기로 받을 때만 준다** `[사용자 지적 2026-09-16: 5초 주기마다
   * 업데이트가 되지 않음]`.
   *
   * 주지 않으면 카드는 계열의 마지막 칸을 그대로 쓴다(1분 격자) — 여러 사업장을 한 화면에
   * 그리는 자리는 그쪽이 맞다.
   */
  siteId?: string;
  /**
   * 그릴 묶음. **소절을 나누는 이유는 축이 다르기 때문이다** `[회의 피드백 2026-08-24]`.
   *
   * 수질은 농도(mg/L·NTU·pH)이고 유량은 부피/시간이라, 한 격자에 섞으면 옆 칸과 비교된다는
   * 잘못된 신호를 준다. 유량을 뺐던 원래 이유("11칸을 한 격자에 넣으면 좁은 열에서 단위가
   * 값에 가려진다")도 소절로 나누면 해소된다 — 격자가 각각 8칸·3칸이라 어긋나지 않는다.
   */
  sections: GridSection[];
  /**
   * 적용할 배출허용기준. **넘기지 않으면 기준을 그리지 않는다.**
   *
   * 훅으로 직접 읽지 않는 이유는 이 위젯이 **사업장을 알 필요가 없기** 때문이다 — `data`를
   * 받아 그리는 리프이고, 훅을 부르면 `useSelectedSiteId` → `useRouter`로 이어져 라우터
   * 없이는 렌더도 테스트도 못 한다(실제로 그렇게 터졌다). 어느 표를 쓸지는 **호스트가**
   * 정한다: 방류 지점이면 기준을 넘기고, 공정 중간 단계면 넘기지 않는다 — 방류수 기준을
   * 1차 침전 TOC에 그으면 없는 초과 판정을 만든다.
   */
  limits?: DischargeLimitTable;
  /**
   * 이 격자가 받은 데이터가 **몇 시간치인가**. 대체 텍스트에 적는다(**E5**).
   *
   * 굳은 값(24)을 적어 두던 판본은 기간 필터를 6시간으로 바꿔도 화면을 못 보는 사람에게는
   * 계속 24시간이라고 말했다 — 눈으로는 보이지 않는 거짓말이라 오래 남았다.
   * `data`에서 셀 수도 있지만 표본 간격을 알아야 해서, 자른 쪽이 알려 준다.
   */
  windowHours: number;
  /**
   * 아직 첫 응답이 오지 않았다(`useSiteSeries`의 `pending`).
   *
   * **값 대신 스켈레톤을 그린다** `[사용자 지적 2026-09-07]`. 한때 그 상태가 내장 데이터를
   * 들고 있어 **답이 아닐 수 있는 값이 답의 자리에** 앉았고, 응답이 오면 카드 여덟 장이
   * 눈에 보이게 다시 그려졌다. «모른다»와 «이 값이다»를 가르는 것이 이 저장소의 규약이다
   * (**E4**) — 그 규약을 라벨에만 적용하고 그림에는 적용하지 않고 있었다.
   *
   * 격자 밖이 아니라 **여기서** 가른다: 이 격자가 pending일 때 무엇을 그리는지는 격자가
   * 아는 것이고, 쓰는 화면 넷이 같은 분기를 네 번 적을 이유가 없다.
   */
  pending?: boolean;
}

/**
 * 단위가 다른 항목을 한 축에 겹치지 않는다 — pH 0~14와 EC 0~20,000을 같은 y축에 두면
 * 둘 다 읽을 수 없게 된다. 항목마다 자기 축을 가진 작은 차트로 나눈다(small multiples).
 */
export function WaterQualityGrid({
  data,
  siteId,
  sections,
  limits,
  windowHours,
  pending = false,
}: WaterQualityGridProps) {
  if (pending) return <WaterQualityGridSkeleton sections={sections} />;

  /**
   * 열 수는 뷰포트가 아니라 **이 그리드가 실제로 받은 폭**을 따라야 한다.
   * 같은 위젯이 통합 관제(지도 옆 좁은 열)와 시계열 화면(전폭)에 함께 쓰인다 —
   * 뷰포트로 나누면 한쪽이 반드시 어긋나고, 단위 표기가 값에 가려진다.
   */
  return (
    <div className="@container">
      {/*
       * 칸을 **선이 아니라 면과 간격으로** 나눈다 `[사용자 지시 2026-08-24]`.
       *
       * 예전에는 칸마다 `border-r border-b`를 걸고 음수 여백으로 끝단을 잘라 냈다. 칸의
       * 높이가 서로 다르면(pH만 기준 문구가 한 줄 더 있다) 짧은 칸의 아래 선이 격자 바닥에
       * 닿지 않아 선이 끊겨 보였고, 열 수가 컨테이너 폭에 따라 2↔4로 바뀌어 `nth-child`로
       * 끝단을 고르는 방법도 서로를 되돌렸다. 면은 높이와 무관하게 칸을 그대로 보여 준다.
       */}
      <div className="space-y-3">
        {sections.map((section) => (
          <section key={section.title ?? 'main'}>
            {section.title && (
              <p className="mb-1.5 text-[12px] font-medium text-fg-subtle">{section.title}</p>
            )}
            <StaggerGroup className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4">
              {section.codes.map((code) => (
                <RiseItem key={code}>
                  {isSeriesCode(code) ? (
                    <MiniSeries code={code} data={data} siteId={siteId} table={limits} windowHours={windowHours} />
                  ) : (
                    <NoChannel code={code} />
                  )}
                </RiseItem>
              ))}
              {section.diff && (
                <RiseItem key={section.diff.label}>
                  <DiffCard data={data} spec={section.diff} />
                </RiseItem>
              )}
            </StaggerGroup>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * 계열이 없는 항목. **빈 칸으로 두지 않는다** — 빈 칸은 값을 못 받은 것으로 읽히고
 * `0`은 "흐르지 않았다"가 된다(**E4**). 왜 없는지를 번호와 함께 적는다.
 *
 * 선례가 있다 — `LEGAL_CHECK_ITEMS`의 SS가 `code: null`이고 화면이 `계측 없음`이라 적는다.
 */
function NoChannel({ code }: { code: MeasurementItemCode }) {
  const item = MEASUREMENT_ITEMS[code];
  return (
    <div className="h-full rounded-nested bg-surface-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="text-[12px] font-medium tracking-[0.08em] text-fg-subtle"
          title={`${item.label} · ${item.unitKo}`}
        >
          {item.symbol}
        </span>
      </div>

      <p className={`mt-1 ${VALUE_MD} text-fg-subtle`}>계측 없음</p>
      <p className="mt-0.5 truncate text-[12px] text-fg-muted">{item.label}</p>
      <p className="mt-1 truncate text-[12px] text-fg-subtle">채널 미확정</p>
    </div>
  );
}

/**
 * 두 계열의 **차**. 마지막 표본끼리 뺀다.
 *
 * **한쪽이라도 결측이면 판정하지 않는다** — 없는 값을 0으로 두고 빼면 그 차가 통째로
 * 거짓이 된다(E4). 부호가 뜻을 가지므로 `+`를 붙여 어느 쪽이 큰지 글자로도 말한다.
 */
function DiffCard({
  data,
  spec,
}: {
  data: MeasurementPoint[];
  spec: NonNullable<GridSection['diff']>;
}) {
  const [a, b] = spec.of;
  const item = MEASUREMENT_ITEMS[a];
  const last = [...data].reverse().find((p) => p[a] !== null && p[b] !== null);
  const value = last ? (last[a] as number) - (last[b] as number) : null;
  /* 나간 양이 들어온 양을 넘으면 증발·슬러지로 설명되지 않는다 */
  const suspect = value !== null && value < 0;
  /*
   * **나가는 양이 아예 없으면 `정상 범위`가 아니다** `[사용자 요청 2026-08-28]`.
   *
   * 이 칸의 판정 축은 방류 의심(나간 양 > 들어온 양)이라 큰 양수는 «의심 아님»이 맞다.
   * 그런데 방류를 멈춘 구간에서는 차가 유입 전부(+430 언저리)가 되는데 그것을 `정상 범위`라
   * 적으면 **평상시의 +18과 같은 말**이 된다 — 들어오기만 하고 나가지 않는 상태를 정상이라
   * 부르는 셈이다. 유량을 방류 여부에 맞추면서 드러났다.
   */
  const noOutflow = last !== undefined && last[b] === 0;

  return (
    <div className="h-full rounded-nested bg-surface-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        {/*
         * **기호에 단위 한글을 병기한다** — 같은 격자의 다른 두 카드가 이미 그렇게 하는데
         * 이 카드만 빠져 있었다 `[사용자 지적 2026-08-28]`. `Δ`는 항목 기호가 아니라 두 값의
         * 차이를 뜻하므로 라벨 자리에 `spec.label`(`유입 − 유출`)이 온다.
         */}
        <span
          className="text-[12px] font-medium tracking-[0.08em] text-fg-subtle"
          title={`${spec.label} · 단위 ${item.unit || '없음'} ${item.unitKo}`}
        >
          Δ
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`num ${VALUE_MD}`}
          style={suspect ? { color: statusInk(STATUS_VISUAL.critical) } : undefined}
        >
          {value === null ? '—' : `${value > 0 ? '+' : ''}${formatValue(a, value)}`}
        </span>
        <span className="text-[12px] text-fg-subtle">{item.unit}</span>
      </div>

      <p className="mt-0.5 truncate text-[12px] text-fg-muted">{spec.label}</p>
      <p className="mt-1 truncate text-[12px] text-fg-subtle">
        {value === null
          ? '수신 없음'
          : suspect
            ? '나간 양이 더 많다'
            : noOutflow
              ? '나가는 양 없음'
              : '정상 범위'}
      </p>
    </div>
  );
}

/**
 * **«지금 값» 한 칸** `[사용자 지적 2026-09-16: 5초 주기마다 업데이트가 되지 않음]`.
 *
 * **구독이 이 칸 안에 있다.** 위쪽에서 `useSiteLatest`를 부르면 값이 올 때마다 격자 전체가
 * 다시 그려진다 — 차트 여덟 장이 함께 돌아 화면이 멈춘다. 칸 안으로 내리면 이 글자만 바뀐다.
 *
 * 격자의 마지막 칸은 분 경계라 최대 2분 묵는다. 서버가 그보다 자주 보내는 사업장에서는
 * 들은 것 중 가장 새것을 적고, 못 들었으면(주기가 1분 이상이거나 꼬리가 실패) 격자 값으로
 * 떨어진다 — 그때는 이 부품이 없던 때와 똑같이 동작한다.
 */
function LiveReading({
  siteId,
  code,
  fallback,
}: {
  siteId: string;
  code: SeriesCode;
  fallback: number | null;
}) {
  const live = useSiteLatest(siteId);
  return (
    <LiveValue
      value={formatValue(code, live?.values[code] ?? fallback)}
      className={`${VALUE_MD} text-fg`}
    />
  );
}

function MiniSeries({
  code,
  data,
  siteId,
  table,
  windowHours,
}: {
  code: SeriesCode;
  data: MeasurementPoint[];
  siteId?: string;
  /** `undefined`면 기준을 그리지 않는다 — 방류 지점이 아닌 계열이다 */
  table?: DischargeLimitTable;
  windowHours: number;
}) {
  /*
   * **카드 전체가 hover 면이다** `[사용자 지적 2026-09-07: 작은 선에 정확히 맞춰야 함]`.
   *
   * 차트 상자만 hover 면이면 140px 카드에서 40px 스파크라인에 조준해야 한다 —
   * 근거와 대안 검토는 `shared/lib/chart-relay.ts`가 갖는다.
   */
  const { surfaceProps, chartRef, tooltipActive } = useChartSurface(SPARK_MARGIN);
  const item = MEASUREMENT_ITEMS[code];

  /*
   * **1,440점을 네 번 훑던 것을 한 번으로 묶는다** `[사용자 지적 2026-09-16]`.
   *
   * 메모가 없어 카드가 다시 그려질 때마다 전부 다시 돌았다 — 카드 열한 장이 각자 1,440짜리
   * 배열을 두 개씩 만들고 `data`를 한 번 더 훑었다(실측 약 288ms). 판정에 쓰는 값은
   * **솎지 않은 원본**에서 낸다 — 초과 건수와 기준 구간은 그림이 아니라 사실이다.
   */
  const stats = useMemo(() => {
    const values = data.map((point) => point[code]);

    /*
     * 뒤에서부터 찾는다. `[...values].reverse().find(...)`는 마지막 값 하나를 얻으려고
     * **1,440개를 복사하고 뒤집었다** — 카드마다 그랬다.
     */
    let latest: number | null = null;
    for (let i = values.length - 1; i >= 0; i -= 1) {
      if (values[i] !== null) {
        latest = values[i]!;
        break;
      }
    }

    return {
      latest,
      isMissingNow: isReceptionStalled(values),
      zone: table ? limitZone(code, values, table) : null,
      overCount: table ? countOverLimit(data, code, table) : null,
    };
  }, [data, code, table]);
  const { latest, isMissingNow, zone, overCount } = stats;

  /*
   * **그리는 점만 솎는다**(`screens.md` §8 `솎기`). 판정·현재값은 위에서 원본으로 냈고,
   * 여기서 줄이는 것은 실루엣뿐이다 — 실측으로 차트 비용이 990ms → 260ms 언저리로 준다.
   */
  const chartData = useMemo(() => thinForCode(data, code), [data, code]);

  /* `h-full`이 있어야 칸 높이가 서로 달라도 격자 한 행이 같은 높이로 선다 */
  return (
    <div className="h-full rounded-nested bg-surface-2 p-3" {...surfaceProps}>
      <div className="flex items-baseline justify-between gap-2">
        {/*
         * 단위 한글 병기를 **기호에** 붙인다 `[회의 피드백 2026-08-24]`. 아래 단위 span에만
         * 달면 pH·진동처럼 `unit`이 빈 항목은 그 span이 아예 안 그려져 병기가 사라진다 —
         * 기호는 늘 그려지므로 여기가 안전한 자리다.
         *
         * 카드가 여덟 장 붙어 있어 한글을 인라인으로 넣으면 칸이 뭉개진다. 그래서 툴팁이
         * 맡고, 표 형태(리포트·항목별 요약)는 열이 있어 거기서 두 줄로 낸다.
         */}
        <span
          className="text-[12px] font-medium tracking-[0.08em] text-fg-subtle"
          title={`${item.label} · 단위 ${item.unit || '없음'} ${item.unitKo}`}
        >
          {item.symbol}
        </span>
        {isMissingNow && (
          <span className={`${BADGE_BASE} bg-missing/20 text-fg-subtle`}>
            수신 없음
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        {/*
          * **현재값은 수집 주기마다 갈린다** `[사용자 요청 2026-09-16]`. 5초로 보내는 사업장에서
          * 툭툭 바뀌던 것을 전환으로 잇는다 — 숫자 자체는 보간하지 않는다.
          */}
        {siteId === undefined ? (
          <LiveValue value={formatValue(code, latest)} className={`${VALUE_MD} text-fg`} />
        ) : (
          <LiveReading siteId={siteId} code={code} fallback={latest} />
        )}
        {item.unit && <span className="text-[12px] text-fg-subtle">{item.unit}</span>}
      </div>

      <p className="mt-0.5 truncate text-[12px] text-fg-muted">{item.label}</p>

      {/* 기준을 아는 항목인지, 안다면 넘었는지 — 두 사실을 구분해 적는다 */}
      <LimitNote
        code={code}
        zone={zone}
        overCount={overCount}
        decimals={item.decimals}
        table={table}
      />

      {/* 작은 차트는 현재값이 이미 위에 텍스트로 있다. 항목마다 표를 또 두면 소음이다 */}
      <ChartFigure
        bare
        label={`${item.label}(${item.symbol}) 최근 ${windowHours}시간 추이${
          item.unit ? `, 단위 ${item.unit} ${item.unitKo}` : ''
        }, KST 기준. 현재값 ${formatValue(code, latest)}`}
      >
        <div ref={chartRef} className="-mx-1 mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            {/*
             * `accessibilityLayer={false}` — **툴팁이 화면에 얼어붙는 것을 막는다.**
             *
             * 켜 두면 Recharts가 차트 SVG에 `tabindex="0" role="application"`을 붙이고,
             * **포커스만으로 툴팁을 띄운 뒤 그대로 고정한다.** 마우스로는 지울 수 없다 —
             * 차트를 클릭한 뒤 Tab을 한 번 누르거나 Tab으로 훑다 차트에 닿으면 재현된다.
             *
             * 키보드·보조기술 경로는 `ChartFigure`가 맡는다(`role="img"` + 라벨, 큰 차트는
             * `표로 보기`). `role="application"`은 스크린리더를 응용프로그램 모드로 가둬
             * 오히려 표보다 못하다.
             */}
            <AreaChart
              data={chartData}
              margin={SPARK_MARGIN}
              accessibilityLayer={false}
              /*
               * **스로틀을 끈다** `[사용자 지적 2026-09-07: 툴팁이 뜨문뜨문 뜬다]`.
               *
               * 기본값 `'raf'`는 들어온 `mousemove`마다 앞서 예약한 rAF를 **취소하고 다시
               * 예약한다**(`mouseEventsMiddleware`). 중계가 프레임당 하나로 줄여 보내므로
               * 더 미룰 이유가 없고, 미루는 쪽이 그 경합을 만든다.
               */
              throttledEvents={[]}
            >
              <defs>
                <linearGradient id={`fill-${code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={ACTUAL_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/*
               * 축은 기준에 맞춘다 — 사업장이 달라도 같은 눈금을 써야 서로 비교된다.
               *
               * **기준 밖 영역을 칠하지는 않는다.** 초과가 없으면 그 밴드는 축 여백만큼의
               * 고정 높이(위아래 각 5px)로만 그려져 값이 6.4든 8.5든 똑같았다 — 정보를 담지
               * 않으면서 차트 테두리로 오독됐다. 기준과 초과 건수는 위 캡션이 글로 말한다
               * `[사용자 결정 2026-08-20]`.
               */}
              <YAxis hide domain={zone ? zone.domain : ['dataMin', 'dataMax']} />
              <Tooltip
                /* 포인터가 밖이면 끈다 — 근거는 `shared/lib/use-chart-hover.ts` */
                active={tooltipActive}
                cursor={{ stroke: GRID_HEX, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as MeasurementPoint | undefined;
                  if (!row) return null;
                  const v = row[code];
                  return (
                    <ChartTooltipShell label={`${formatClock(row.t)} KST`}>
                      <ChartTooltipRow
                        color={v === null ? MISSING_HEX : ACTUAL_HEX}
                        name={item.label}
                        value={
                          v === null ? '수신 없음' : `${formatValue(code, v)} ${item.unit}`.trim()
                        }
                      />
                    </ChartTooltipShell>
                  );
                }}
              />
              {/* 결측은 이어 그리지 않는다 — 끊긴 자리가 통신 두절을 말해 준다(E4) */}
              <Area
                type="monotone"
                strokeLinecap="round"
                strokeLinejoin="round"
                dataKey={code}
                stroke={ACTUAL_HEX}
                strokeWidth={1.8}
                fill={`url(#fill-${code})`}
                connectNulls={false}
                /*
                 * **`dot`에 함수를 넘기지 않는다** `[사용자 지적 2026-09-16: 렌더링이 굉장히
                 * 느려졌다]`.
                 *
                 * 2026-09-16에 «선의 끝에 지금 값 표식»을 넣으며 여기에 함수를 넘겼는데,
                 * Recharts는 그 함수를 **점마다** 부른다 — 점 1,440개 × 차트 8장이라 **약
                 * 11,500개 요소를 만들어 그중 8개만 썼다.** 계측이 도착할 때마다 화면이
                 * 멈추는 시간이 **4.9초 → 11.1초**로 늘었다(실측).
                 *
                 * 표식 자체도 근거를 잃었다 — 그때는 꼬리를 계열 끝 칸에 합쳐 **선 끝이 5초마다
                 * 움직였고** 그 움직임을 설명할 표식이 필요했다. 지금은 계열이 1분 격자 그대로라
                 * 선이 떨지 않는다. 다시 필요해지면 **점마다 부르지 않는 방법**으로 만든다.
                 */
                dot={false}
                activeDot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--surface)', fill: ACTUAL_HEX }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartFigure>
    </div>
  );
}

/**
 * `null`은 "초과가 없다"가 아니라 "판정할 기준표가 없다"는 뜻이다 — 두 문장을 다르게 적는다.
 * 기준값이 있는 항목도 `통상` 범위라 확정 기준처럼 보이지 않게 출처를 함께 남긴다
 * (`[공정자료 p.11]`: 정확한 적용 구간은 사업장 허가증에서 확인).
 */
function LimitNote({
  code,
  zone,
  overCount,
  decimals,
  table,
}: {
  code: SeriesCode;
  zone: LimitZone | null;
  overCount: number | null;
  decimals: number;
  table?: DischargeLimitTable;
}) {
  /* 기준을 그리지 않는 계열이면 문구도 없다 — `미확정`이라 적으면 기준이 있어야 하는 것처럼 읽힌다 */
  if (!table) return null;

  const limit = table[code];
  if (!limit) return null;

  const range = formatLimitRange(limit, decimals);
  if (!zone || overCount === null || range === null) {
    return <p className="mt-1 truncate text-[12px] text-fg-subtle">{UNRESOLVED_LIMIT_TEXT}</p>;
  }

  return (
    <p className="mt-1 truncate text-[12px] text-fg-subtle" title={limit.source}>
      <span className="num">기준 {range}</span>{' '}
      · {overCount === 0 ? '초과 없음' : `초과 ${overCount}건`}
    </p>
  );
}
