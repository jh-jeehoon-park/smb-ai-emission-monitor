'use client';

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
} from '@/entities/measurement';
import { limitZone, type LimitZone } from '../lib/limit-zone';
import { useChartHover } from '@/shared/lib/use-chart-hover';

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
}

/**
 * 단위가 다른 항목을 한 축에 겹치지 않는다 — pH 0~14와 EC 0~20,000을 같은 y축에 두면
 * 둘 다 읽을 수 없게 된다. 항목마다 자기 축을 가진 작은 차트로 나눈다(small multiples).
 */
export function WaterQualityGrid({ data, sections, limits, windowHours }: WaterQualityGridProps) {
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
                    <MiniSeries code={code} data={data} table={limits} windowHours={windowHours} />
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
      <p className="mt-1 truncate text-[12px] text-fg-subtle">채널 미확정 [TBD-52]</p>
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

  return (
    <div className="h-full rounded-nested bg-surface-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium tracking-[0.08em] text-fg-subtle">Δ</span>
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
        {value === null ? '수신 없음' : suspect ? '나간 양이 더 많다' : '정상 범위'}
      </p>
    </div>
  );
}

function MiniSeries({
  code,
  data,
  table,
  windowHours,
}: {
  code: SeriesCode;
  data: MeasurementPoint[];
  /** `undefined`면 기준을 그리지 않는다 — 방류 지점이 아닌 계열이다 */
  table?: DischargeLimitTable;
  windowHours: number;
}) {
  const { hoverProps, tooltipActive } = useChartHover();
  const item = MEASUREMENT_ITEMS[code];
  const values = data.map((p) => p[code]);
  const latest = [...values].reverse().find((v) => v !== null) ?? null;
  const isMissingNow = values[values.length - 1] === null;
  const zone = table ? limitZone(code, values, table) : null;
  const overCount = table ? countOverLimit(data, code, table) : null;

  /* `h-full`이 있어야 칸 높이가 서로 달라도 격자 한 행이 같은 높이로 선다 */
  return (
    <div className="h-full rounded-nested bg-surface-2 p-3">
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
        <span className={`num ${VALUE_MD} text-fg`}>
          {formatValue(code, latest)}
        </span>
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
        <div className="-mx-1 mt-2 h-10" {...hoverProps}>
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
              data={data}
              margin={{ top: 2, right: 2, bottom: 0, left: 2 }}
              accessibilityLayer={false}
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
