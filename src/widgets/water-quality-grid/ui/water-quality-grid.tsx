'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import {
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { ACTUAL_HEX, GRID_HEX, MISSING_HEX } from '@/shared/config/status-visual';
import { formatClock, formatValue } from '@/shared/lib/format';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { countOverLimit, type MeasurementPoint, type SeriesCode } from '@/entities/measurement';
import { limitZone, type LimitZone } from '../lib/limit-zone';

interface WaterQualityGridProps {
  data: MeasurementPoint[];
  codes: SeriesCode[];
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
}

/**
 * 단위가 다른 항목을 한 축에 겹치지 않는다 — pH 0~14와 EC 0~20,000을 같은 y축에 두면
 * 둘 다 읽을 수 없게 된다. 항목마다 자기 축을 가진 작은 차트로 나눈다(small multiples).
 */
export function WaterQualityGrid({ data, codes, limits }: WaterQualityGridProps) {
  /**
   * 열 수는 뷰포트가 아니라 **이 그리드가 실제로 받은 폭**을 따라야 한다.
   * 같은 위젯이 통합 관제(지도 옆 좁은 열)와 시계열 화면(전폭)에 함께 쓰인다 —
   * 뷰포트로 나누면 한쪽이 반드시 어긋나고, 단위 표기가 값에 가려진다.
   */
  return (
    <div className="@container">
      {/*
       * 격자선을 **칸의 테두리로** 긋는다. 예전에는 `gap-px` + 컨테이너 `bg-border`로 그었는데,
       * 그러면 칸이 행 높이를 다 채우지 못할 때 그 밑바탕이 그대로 드러난다 — pH 카드만
       * 기준 문구 한 줄이 더 있어 첫 행이 높아졌고, 나머지 카드 아래로 넓은 색면이 깔렸다.
       *
       * 음수 여백은 **마지막 열·행의 테두리를 패널 테두리와 겹치게** 하려는 것이다. 없으면
       * 오른쪽에 2px 선이 생기고 아래 캡션의 `border-t`와도 겹쳐 이중선이 된다.
       * `nth-child`로 끝단을 골라내는 방법도 있으나 열 수가 컨테이너 폭에 따라 2↔4로 바뀌어
       * 규칙이 서로를 되돌리게 된다.
       */}
      <StaggerGroup className="-mr-px -mb-px grid grid-cols-2 @[560px]:grid-cols-4">
        {codes.map((code) => (
          <RiseItem key={code} className="border-r border-b border-border">
            <MiniSeries code={code} data={data} table={limits} />
          </RiseItem>
        ))}
      </StaggerGroup>
    </div>
  );
}

function MiniSeries({
  code,
  data,
  table,
}: {
  code: SeriesCode;
  data: MeasurementPoint[];
  /** `undefined`면 기준을 그리지 않는다 — 방류 지점이 아닌 계열이다 */
  table?: DischargeLimitTable;
}) {
  const item = MEASUREMENT_ITEMS[code];
  const values = data.map((p) => p[code]);
  const latest = [...values].reverse().find((v) => v !== null) ?? null;
  const isMissingNow = values[values.length - 1] === null;
  const zone = table ? limitZone(code, values, table) : null;
  const overCount = table ? countOverLimit(data, code, table) : null;

  /* 칸을 다 채워야 hover 면이 칸 전체에 걸린다 — 안 그러면 내용 높이만큼만 밝아진다 */
  return (
    <div className="group h-full bg-surface p-3 transition-colors duration-200 hover:bg-surface-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-fg-subtle">
          {item.symbol}
        </span>
        {isMissingNow && (
          <span className="rounded-[3px] bg-missing/20 px-1 py-px text-[11px] text-fg-subtle">
            수신 없음
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[19px] font-medium leading-none text-fg">
          {formatValue(code, latest)}
        </span>
        {item.unit && <span className="text-[11px] text-fg-subtle">{item.unit}</span>}
      </div>

      <p className="mt-0.5 truncate text-[11px] text-fg-muted">{item.label}</p>

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
        label={`${item.label}(${item.symbol}) 최근 24시간 추이${
          item.unit ? `, 단위 ${item.unit}` : ''
        }, KST 기준. 현재값 ${formatValue(code, latest)}`}
      >
        <div className="-mx-1 mt-2 h-10">
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
                  <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity={0.22} />
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
                dataKey={code}
                stroke={ACTUAL_HEX}
                strokeWidth={1.4}
                fill={`url(#fill-${code})`}
                connectNulls={false}
                dot={false}
                activeDot={{ r: 2.5, strokeWidth: 0, fill: ACTUAL_HEX }}
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
    return <p className="mt-1 truncate text-[11px] text-fg-subtle">{UNRESOLVED_LIMIT_TEXT}</p>;
  }

  return (
    <p className="mt-1 truncate text-[11px] text-fg-subtle" title={limit.source}>
      <span className="num">기준 {range}</span>{' '}
      · {overCount === 0 ? '초과 없음' : `초과 ${overCount}건`}
    </p>
  );
}
