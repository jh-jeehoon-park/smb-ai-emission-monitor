'use client';

import { useMemo } from 'react';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Panel } from '@/shared/ui/panel';
import { StatTile } from '@/shared/ui/stat-tile';
import { energyIntensity, getMeasurementSeries } from '@/entities/measurement';
import {
  CHEMICAL_SAVING_RANGE,
  COST_EXAMPLE_KRW,
  DOSING_DECIMALS,
  ENERGY_DECIMALS,
  ENERGY_SAVING_TARGET,
  OPEX_SAVING_TARGET,
  OPTIMIZATION_INPUT_LABEL,
  getOptimization,
  type DosingAdvice,
  type OperatingAdvice,
} from '@/entities/optimization';
import { getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';

const KRW = new Intl.NumberFormat('ko-KR');

export function OptimizationView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);

  /**
   * 에너지 효율은 계측에서 계산해 최적화 슬라이스에 넘긴다.
   * slice끼리 참조하지 않으므로(FSD §8) 두 도메인을 잇는 일은 위젯이 한다.
   */
  const summary = useMemo(() => {
    const energyNow = energyIntensity(getMeasurementSeries(siteId));
    return getOptimization(siteId, energyNow);
  }, [siteId]);

  if (!summary.online) {
    return (
      <Panel eyebrow={site.name} title="운영 최적화">
        <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
          <p className="num text-[26px] leading-none text-fg-subtle">—</p>
          <p className="text-[12px] text-fg-muted">산출값 없음</p>
          <p className="max-w-[52ch] text-[12px] leading-relaxed text-fg-subtle">
            ECP 통신이 두절되어 최적화가 산출되지 않았습니다. 마지막 산출{' '}
            <span className="num">{formatDateTime(summary.computedAtIso)}</span> {DISPLAY_TIMEZONE}.
            옛 권장값을 현재값처럼 두지 않습니다.
          </p>
        </div>
      </Panel>
    );
  }

  const { dosing } = summary;
  const savedChemical = Math.round((COST_EXAMPLE_KRW.annualChemical * dosing.savingRate) / 100);
  const savedPower = Math.round((COST_EXAMPLE_KRW.annualPower * ENERGY_SAVING_TARGET) / 100);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="약품비 절감"
          value={`${dosing.savingRate}%`}
          note={`검증 수준 ${CHEMICAL_SAVING_RANGE[0]}~${CHEMICAL_SAVING_RANGE[1]}%`}
          accent={statusInk(STATUS_VISUAL.normal)}
        />
        <StatTile
          label="에너지 절감 목표"
          value={`${ENERGY_SAVING_TARGET}%`}
          note="kWh/m³ 기준"
          accent={statusInk(STATUS_VISUAL.normal)}
        />
        <StatTile
          label="총 운영비 절감 목표"
          value={`${OPEX_SAVING_TARGET}%`}
          note="설비 최적화 + 약품 최적화"
        />
        <StatTile
          label="현재 에너지 효율"
          value={
            summary.energy.current === null
              ? '—'
              : `${summary.energy.current.toFixed(ENERGY_DECIMALS)}`
          }
          note="kWh/m³ · 계측 전력÷유량"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          eyebrow={`${summary.modelLabel} · ${site.name}`}
          title="약품 주입량 최적화"
          action={<span className="text-[12px] text-fg-subtle">현재 대비 권장</span>}
        >
          <DosingCompare dosing={dosing} />
        </Panel>

        <Panel
          eyebrow="에너지 효율"
          title="kWh/m³"
          action={<span className="text-[12px] text-fg-subtle">계측 전력·유량에서 산출</span>}
        >
          <EnergyCompare
            current={summary.energy.current}
            target={summary.energy.target}
            rate={summary.energy.savingRate}
          />
        </Panel>
      </div>

      <Panel
        eyebrow={`${summary.operating.length}개 운영 변수`}
        title="설비 운전 조건 제안"
        action={
          <span className="text-[12px] text-fg-subtle">
            절대 단위가 원문에 없어 상대 변화로 표기
          </span>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {summary.operating.map((advice) => (
            <li key={advice.id}>
              <OperatingRow advice={advice} />
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel eyebrow="사업계획서 p.32·p.34 예시 기준" title="예상 비용 절감액">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            <CostRow
              label="연 약품비"
              base={COST_EXAMPLE_KRW.annualChemical}
              saved={savedChemical}
            />
            <CostRow label="연 전력비" base={COST_EXAMPLE_KRW.annualPower} saved={savedPower} />
          </dl>
          <p className="mt-3 max-w-[70ch] border-t border-border pt-2.5 text-[12px] leading-relaxed text-fg-subtle">
            <strong className="text-fg-muted">이 사업장의 실제 비용이 아닙니다.</strong> 원문이 든
            예시 금액(연 약품비 1,000만 원 · 연 전력비 500만 원)에 위 절감률을 적용한 값입니다.
            사업장별 약품 단가와 계약 전력이 원문에 없어 금액을 사업장마다 만들지 않았습니다.
          </p>
        </Panel>

        <Panel eyebrow="E3 · 산출 근거" title="이 값이 나온 배경">
          <dl className="grid grid-cols-1 gap-y-2 text-[11px] sm:grid-cols-2 sm:gap-x-6">
            <Meta label="산출 모델" value={`${summary.modelLabel} (다중 에이전트 강화학습)`} />
            <Meta
              label="산출 시각"
              value={`${formatDateTime(summary.computedAtIso)} ${DISPLAY_TIMEZONE}`}
              mono
            />
            <Meta label="입력 대상 기간" value={summary.inputWindowLabel} />
            <Meta label="입력 변수" value={OPTIMIZATION_INPUT_LABEL} />
          </dl>

          <p className="mt-3 max-w-[70ch] border-t border-border pt-2.5 text-[12px] leading-relaxed text-fg-subtle">
            약품 주입량의 단위·범위는 원문에 없어(계측 사양 p.55에 없고 AI 입력으로만 언급됨)
            시연에서 L/h로 표기했습니다. 설비 수명 증가 목표는 같은 페이지 안에서 ≥15%와 ≥10%로 갈려
            있어(INC-18) 화면에 넣지 않았습니다.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/** 현재와 권장을 같은 축의 막대로 겹쳐 둔다 — 숫자만으로는 차이가 눈에 들어오지 않는다 */
function DosingCompare({ dosing }: { dosing: DosingAdvice }) {
  const max = Math.max(dosing.currentDose, dosing.recommendedDose);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-fg-subtle">권장 주입량</p>
          <p
            className="num mt-1 text-[30px] font-semibold leading-none tracking-tight"
            style={{ color: statusInk(STATUS_VISUAL.normal) }}
          >
            {dosing.recommendedDose.toFixed(DOSING_DECIMALS)}
            <span className="ml-1.5 text-[11px] font-normal text-fg-subtle">{dosing.unit}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-fg-subtle">현재</p>
          <p className="num mt-1 text-[17px] leading-none text-fg-muted">
            {dosing.currentDose.toFixed(DOSING_DECIMALS)}
            <span className="ml-1 text-[11px] text-fg-subtle">{dosing.unit}</span>
          </p>
          <p className="num mt-1 text-[11px]" style={{ color: statusInk(STATUS_VISUAL.normal) }}>
            −{dosing.savingRate}%
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <DoseBar
          label="현재"
          value={dosing.currentDose}
          max={max}
          tone="muted"
          unit={dosing.unit}
        />
        <DoseBar
          label="권장"
          value={dosing.recommendedDose}
          max={max}
          tone="normal"
          unit={dosing.unit}
        />
      </div>

      <div className="mt-4 border-t border-border pt-2.5">
        <p className="text-[11px] text-fg-subtle">권장 근거</p>
        <ul className="mt-1.5 space-y-1">
          {dosing.basis.map((reason) => (
            <li key={reason} className="flex gap-1.5 text-[11px] text-fg-muted">
              <span aria-hidden className="text-fg-subtle">
                ·
              </span>
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DoseBar({
  label,
  value,
  max,
  tone,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'muted' | 'normal';
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-fg-subtle">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${(value / max) * 100}%`,
            backgroundColor: tone === 'normal' ? 'var(--normal)' : 'var(--missing)',
          }}
        />
      </span>
      <span className="num w-[74px] shrink-0 text-right text-[11px] text-fg-muted">
        {value.toFixed(DOSING_DECIMALS)} {unit}
      </span>
    </div>
  );
}

function EnergyCompare({
  current,
  target,
  rate,
}: {
  current: number | null;
  target: number | null;
  rate: number;
}) {
  if (current === null || target === null) {
    return <p className="py-8 text-center text-[12px] text-fg-subtle">계측값이 없어 산출 불가</p>;
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-fg-subtle">최적화 적용 시</p>
          <p
            className="num mt-1 text-[30px] font-semibold leading-none tracking-tight"
            style={{ color: statusInk(STATUS_VISUAL.normal) }}
          >
            {target.toFixed(ENERGY_DECIMALS)}
            <span className="ml-1.5 text-[11px] font-normal text-fg-subtle">kWh/m³</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-fg-subtle">현재</p>
          <p className="num mt-1 text-[17px] leading-none text-fg-muted">
            {current.toFixed(ENERGY_DECIMALS)}
          </p>
          <p className="num mt-1 text-[11px]" style={{ color: statusInk(STATUS_VISUAL.normal) }}>
            −{rate}%
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-[52ch] border-t border-border pt-2.5 text-[12px] leading-relaxed text-fg-subtle">
        현재값은 최근 24시간 평균 전력(kW)에 24를 곱해 평균 유량(m³/day)으로 나눈 값입니다. 결측
        표본은 빼고 계산합니다 — 0으로 채우면 효율이 실제보다 좋아 보입니다.
      </p>
    </div>
  );
}

function OperatingRow({ advice }: { advice: OperatingAdvice }) {
  const up = advice.deltaPercent > 0;
  const magnitude = Math.min(Math.abs(advice.deltaPercent), 20) * 5;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
      <span className="min-w-0 flex-1 basis-[200px]">
        <span className="block text-[12px] text-fg">
          {advice.parameter}
          <span className="ml-2 text-[11px] text-fg-subtle">{advice.target}</span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-subtle">
          {advice.reason}
        </span>
      </span>

      {/* 방향과 크기를 같은 축의 막대로 — 부호만으로는 크기가 비교되지 않는다 */}
      <span aria-hidden className="flex w-[120px] shrink-0 items-center justify-center">
        <span className="relative h-2 w-full rounded-full bg-surface-3">
          <span
            className={cn(
              'absolute top-0 block h-full',
              up ? 'left-1/2 rounded-r-full' : 'rounded-l-full',
            )}
            style={{
              width: `${magnitude / 2}%`,
              ...(up ? {} : { right: '50%' }),
              backgroundColor: up ? 'var(--warning)' : 'var(--normal)',
            }}
          />
        </span>
      </span>

      <span
        className="num w-[64px] shrink-0 text-right text-[13px]"
        style={{ color: statusInk(up ? STATUS_VISUAL.warning : STATUS_VISUAL.normal) }}
      >
        {up ? '+' : ''}
        {advice.deltaPercent}%
      </span>
    </div>
  );
}

function CostRow({ label, base, saved }: { label: string; base: number; saved: number }) {
  return (
    <div>
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd className="num mt-1 text-[19px] font-semibold leading-none text-fg">
        −{KRW.format(saved)}
        <span className="ml-1 text-[11px] font-normal text-fg-subtle">원/년</span>
      </dd>
      <dd className="num mt-1 text-[11px] text-fg-subtle">기준 {KRW.format(base)}원/년</dd>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={mono ? 'num mt-0.5 text-fg-muted' : 'mt-0.5 leading-relaxed text-fg-muted'}>
        {value}
      </dd>
    </div>
  );
}
