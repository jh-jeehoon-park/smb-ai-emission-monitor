'use client';

import { useMemo } from 'react';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { Panel } from '@/shared/ui/panel';
import { StatTile } from '@/shared/ui/stat-tile';
import { countAnomalyAlarms } from '@/entities/alarm';
import { getEquipment, sortEquipment, type Equipment } from '@/entities/equipment';
import { energyIntensity, getMeasurementSeries } from '@/entities/measurement';
import {
  ANNUAL_SAVING_KRW_RANGE,
  CHEMICAL_SAVING_RANGE,
  COST_EXAMPLE_KRW,
  ENERGY_SAVING_TARGET,
  INCIDENT_AVOIDED_KRW_RANGE,
  OPEX_SAVING_TARGET,
  TMS_AVOIDED_KRW_RANGE,
  calcCostSavings,
  formatKrw,
  getOptimization,
  type CostSavings,
} from '@/entities/optimization';
import { getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';

const NUMBER = new Intl.NumberFormat('ko-KR');
const RATE_DECIMALS = PROVISIONAL_DISPLAY_DECIMALS.savingRate;

const manwon = (krw: number) => formatKrw(krw, PROVISIONAL_DISPLAY_DECIMALS.savingKrwEok);
const rate = (value: number) => `${value.toFixed(RATE_DECIMALS)}%`;

/**
 * 관리자가 이 시스템에 돈을 내는 이유를 담는 화면이다. 운영자가 "어디가 이상한가"를
 * 묻는다면 관리자는 "얼마 아꼈나"를 묻는다(회의 2026-08-13).
 *
 * **금액은 전부 원문 예시 사업장 기준이다.** 사업장별 약품 단가·계약 전력 단가가
 * 원문에 없어(TBD-41) 실금액을 만들 수 없다. 화면 위에 그 사실을 상시 노출한다.
 */
export function CostSavingsView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);

  const summary = useMemo(() => {
    const energyNow = energyIntensity(getMeasurementSeries(siteId));
    return getOptimization(siteId, energyNow);
  }, [siteId]);

  const detections = countAnomalyAlarms(siteId);
  const equipment = useMemo(() => sortEquipment(getEquipment(siteId), 'rul'), [siteId]);

  if (!summary.online) {
    return (
      <Panel eyebrow={site.name} title="비용 절감 현황">
        <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
          <p className="num text-[26px] leading-none text-fg-subtle">—</p>
          <p className="text-[12px] text-fg-muted">산출 불가</p>
          <p className="max-w-[52ch] text-[12px] leading-relaxed text-fg-subtle">
            ECP 통신이 두절되어 절감액의 입력인 약품 주입량·전력 계측이 없습니다. 마지막 산출{' '}
            <span className="num">{formatDateTime(summary.computedAtIso)}</span> {DISPLAY_TIMEZONE}.
            계측 없이 절감액을 적으면 아끼지 않은 돈을 아꼈다고 적는 것이 됩니다.
          </p>
        </div>
      </Panel>
    );
  }

  const savings = calcCostSavings(summary.dosing.savingRate, summary.energy.savingRate);

  return (
    <div className="space-y-3">
      <ExampleCostNotice />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="월 절감 (예시 기준)"
          value={manwon(savings.monthlyKrw)}
          note="연 절감액 ÷ 12"
          accent={statusInk(STATUS_VISUAL.normal)}
        />
        <StatTile
          label="약품비 절감률"
          value={rate(savings.chemicalRate)}
          note={`검증 수준 ${CHEMICAL_SAVING_RANGE[0]}~${CHEMICAL_SAVING_RANGE[1]}%`}
        />
        <StatTile
          label="전력비 절감률"
          value={rate(savings.powerRate)}
          note={`목표 절감률 ≥${ENERGY_SAVING_TARGET}% 적용값`}
        />
        <StatTile
          label="연 환산"
          value={manwon(savings.annualKrw)}
          note="약품비 + 전력비만 · 사고 회피는 아래에 따로"
        />
      </div>

      <Panel
        eyebrow={site.name}
        title="절감 실적 — 목표 대비"
        action={<span className="text-[12px] text-fg-subtle">목표는 전부 원문 수치</span>}
      >
        <TargetBars savings={savings} />
        {/* 절감률은 XMARL-PPO가 낸 값이다. AI 산출값에는 산출 시각·대상 기간을 함께 낸다(E3) */}
        <AiProvenance
          model={summary.modelLabel}
          computedAtIso={summary.computedAtIso}
          windowLabel={summary.inputWindowLabel}
        />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          eyebrow="가정 기반"
          title="막은 사고"
          action={<span className="text-[12px] text-fg-subtle">건수와 금액을 나눠 적는다</span>}
        >
          <AvoidedIncidents detections={detections} />
        </Panel>

        <Panel
          eyebrow="펌프 · 폭기장치만 대상"
          title="설비 교체 시점"
          action={<span className="text-[12px] text-fg-subtle">잔여 수명 순</span>}
        >
          <ReplacementList equipment={equipment} />
        </Panel>
      </div>

      <Panel eyebrow="초년도 1회성" title="TMS 구축 비용 회피">
        <TmsAvoidance />
      </Panel>

      <Panel eyebrow="월별 누적 추이" title="산출 불가">
        <MonthlyTrendEmpty />
      </Panel>

      <Panel eyebrow="산출 근거" title="이 값이 나온 배경">
        <Basis savings={savings} detections={detections} />
      </Panel>
    </div>
  );
}

function AiProvenance({
  model,
  computedAtIso,
  windowLabel,
}: {
  model: string;
  computedAtIso: string;
  windowLabel: string;
}) {
  return (
    <dl className="mt-2.5 grid grid-cols-1 gap-y-1.5 border-t border-border pt-2.5 text-[11px] sm:grid-cols-3 sm:gap-x-6">
      <div>
        <dt className="text-fg-subtle">산출 모델</dt>
        <dd className="mt-0.5 text-fg-muted">{model}</dd>
      </div>
      <div>
        <dt className="text-fg-subtle">산출 시각</dt>
        <dd className="num mt-0.5 text-fg-muted">
          {formatDateTime(computedAtIso)} {DISPLAY_TIMEZONE}
        </dd>
      </div>
      <div>
        <dt className="text-fg-subtle">입력 대상 기간</dt>
        <dd className="mt-0.5 text-fg-muted">{windowLabel}</dd>
      </div>
    </dl>
  );
}

function ExampleCostNotice() {
  return (
    <p className="rounded-[5px] border border-border bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-fg-muted">
      금액은 <strong className="font-semibold text-fg">원문이 든 예시 사업장 기준</strong>이며 이
      사업장의 실제 비용이 아닙니다. 약품 단가와 계약 전력 단가가 원문에 없어 사업장별 실금액을
      낼 수 없습니다. 절감<strong className="font-semibold text-fg">률</strong>은 이 사업장의
      계측에서 산출한 값입니다.
    </p>
  );
}

interface TargetRow {
  label: string;
  value: number;
  targetLabel: string;
  /** 막대 눈금의 오른쪽 끝. 목표 상한이 보이도록 잡는다 */
  scaleMax: number;
  met: boolean;
}

function TargetBars({ savings }: { savings: CostSavings }) {
  const rows: TargetRow[] = [
    {
      label: '약품비',
      value: savings.chemicalRate,
      targetLabel: `목표 ${CHEMICAL_SAVING_RANGE[0]}~${CHEMICAL_SAVING_RANGE[1]}%`,
      scaleMax: 40,
      met: savings.chemicalRate >= CHEMICAL_SAVING_RANGE[0],
    },
    {
      label: '전력비',
      value: savings.powerRate,
      targetLabel: `목표 ≥${ENERGY_SAVING_TARGET}%`,
      scaleMax: 40,
      met: savings.powerRate >= ENERGY_SAVING_TARGET,
    },
    {
      label: '총 운영비',
      value: savings.opexRate,
      targetLabel: `목표 ≥${OPEX_SAVING_TARGET}%`,
      scaleMax: 40,
      met: savings.opexRate >= OPEX_SAVING_TARGET,
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)_66px] items-center gap-3">
          <span className="text-[12px] text-fg-muted">{row.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${Math.min(100, (row.value / row.scaleMax) * 100)}%`,
                background: row.met ? 'var(--normal)' : 'var(--caution)',
              }}
            />
          </div>
          <span className="num text-right text-[12px] text-fg">{rate(row.value)}</span>
          <span className="col-start-2 col-end-4 -mt-1.5 text-[11px] text-fg-subtle">
            {row.targetLabel}
            {row.met ? ' · 충족' : ' · 미달'}
          </span>
        </div>
      ))}

      <p className="border-t border-border pt-2.5 text-[11px] leading-relaxed text-fg-subtle">
        총 운영비 절감률은 두 비율의 평균이 아니라 <span className="num">금액</span>으로 가중한
        값입니다. 약품비가 전력비의 2배라 평균을 쓰면 전력 절감이 실제보다 크게 반영됩니다.
      </p>
    </div>
  );
}

function AvoidedIncidents({ detections }: { detections: number }) {
  if (detections === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-[12px] text-fg-muted">탐지된 이상 없음</p>
        <p className="mt-1 text-[11px] text-fg-subtle">
          회피 비용을 <span className="num">0원</span>으로 적지 않습니다 — 탐지가 없었다는 뜻이지
          가치가 0이라는 뜻이 아닙니다.
        </p>
      </div>
    );
  }

  const [low, high] = INCIDENT_AVOIDED_KRW_RANGE;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-fg-subtle">조기 탐지</p>
        <p className="num mt-1 text-[26px] font-semibold leading-none tracking-tight text-fg">
          {detections}건
        </p>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[11px] text-fg-subtle">회피 가능 비용 (가정)</p>
        <p className="num mt-1 text-[18px] font-semibold leading-none tracking-tight text-fg-muted">
          {manwon(detections * low)} ~ {manwon(detections * high)}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-fg-subtle">
          건당 {manwon(low)} 또는 {manwon(high)} 기준. 원문이 같은 항목에 두 값을 주어
          <strong className="font-medium text-fg-muted"> 하나를 고르지 않았습니다</strong>. 사고 시
          평균 대응 비용은 {manwon(COST_EXAMPLE_KRW.incidentResponse)}입니다.
        </p>
      </div>

      <p className="rounded-[4px] bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-fg-subtle">
        <strong className="font-medium text-fg-muted">실제 사고 발생 여부와 무관한 상한값입니다.</strong>{' '}
        탐지했어도 사고로 이어지지 않았을 수 있어 위 절감률과 합산하지 않습니다.
      </p>
    </div>
  );
}

function ReplacementList({ equipment }: { equipment: Equipment[] }) {
  return (
    <div className="space-y-2">
      {equipment.map((item) => (
        <div
          key={item.id}
          className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-[12px] text-fg">{item.name}</p>
            <p className="text-[11px] text-fg-subtle">
              고장 확률 <span className="num">{item.failureProbability}</span>% · 누적 가동{' '}
              <span className="num">{NUMBER.format(item.runtimeHours)}</span>시간
            </p>
          </div>
          <p className="num shrink-0 text-[13px] font-semibold" style={{ color: statusInk(STATUS_VISUAL[item.status]) }}>
            {item.remainingUsefulLifeDays}일 후
          </p>
        </div>
      ))}
      <p className="pt-1 text-[11px] leading-relaxed text-fg-subtle">
        예지보전 대상은 <strong className="font-medium text-fg-muted">펌프·폭기장치</strong>뿐입니다.
        다른 설비를 넣으면 원문 범위를 넘습니다. 잔여 수명의 단위(일)는 원문에 없어 임시값입니다.
      </p>
    </div>
  );
}

function TmsAvoidance() {
  const [low, high] = TMS_AVOIDED_KRW_RANGE;

  return (
    <div className="space-y-2">
      <p className="num text-[22px] font-semibold leading-none tracking-tight text-fg">
        {manwon(low)} ~ {manwon(high)}
      </p>
      <p className="text-[11px] leading-relaxed text-fg-subtle">
        기존 TMS는 구축비가 2~3억 원이라 소규모 사업장이 도입할 수 없었고, 본 시스템은 5,000만
        원입니다. <strong className="font-medium text-fg-muted">초년도에만 발생하는 1회성 차액</strong>
        이라 위의 연간 절감액과 합치지 않습니다 — 합치면 매년 반복되는 절감처럼 읽힙니다. 기존
        구축비는 원문 안에서 값이 갈립니다.
      </p>
    </div>
  );
}

function MonthlyTrendEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
      <p className="num text-[26px] leading-none text-fg-subtle">—</p>
      <p className="text-[12px] text-fg-muted">월별 추이를 만들 수 없습니다</p>
      <p className="max-w-[56ch] text-[12px] leading-relaxed text-fg-subtle">
        이 화면의 계측 데이터는 <span className="num">24</span>시간 구간뿐입니다. 월별 절감 추이를
        그리려면 없는 기간을 지어내야 하고, 그리는 순간
        <strong className="font-medium text-fg-muted"> &ldquo;실제로 그만큼 아꼈다&rdquo;는 근거 없는 주장</strong>
        이 됩니다. 빈 상태로 둡니다.
      </p>
    </div>
  );
}

function Basis({ savings, detections }: { savings: CostSavings; detections: number }) {
  const items: { term: string; desc: string }[] = [
    {
      term: '약품비 절감액',
      desc: `연 ${manwon(COST_EXAMPLE_KRW.annualChemical)} × ${rate(savings.chemicalRate)} = ${manwon(savings.chemicalAnnualKrw)}`,
    },
    {
      term: '전력비 절감액',
      desc: `연 ${manwon(COST_EXAMPLE_KRW.annualPower)} × ${rate(savings.powerRate)} = ${manwon(savings.powerAnnualKrw)}`,
    },
    {
      term: '총 운영비 절감률',
      desc: `(약품 절감액 + 전력 절감액) ÷ (연 약품비 + 연 전력비) = ${rate(savings.opexRate)}`,
    },
    {
      term: '조기 탐지 건수',
      desc: `이 사업장의 이상 탐지 알람 ${detections}건. 확인·조치 상태는 세지 않는다`,
    },
    {
      term: '기준 금액의 출처',
      desc: '연 약품비 1,000만 원 · 연 전력비 500만 원 · 사고 1회 3,000만 원은 원문이 든 예시값이다',
    },
    {
      term: '원문 합계와의 차이',
      desc: `원문은 연 절감 합계를 ${manwon(ANNUAL_SAVING_KRW_RANGE[0])}~${manwon(ANNUAL_SAVING_KRW_RANGE[1])}로 적는데 항목을 더하면 상한이 맞지 않는다. 코드로 메우지 않는다`,
    },
    {
      term: '쓰지 않은 계산',
      desc: '건수 × 3,000만 × 70% 같은 우리 곱셈을 쓰지 않는다. 원문이 명시한 절감액만 그대로 쓴다',
    },
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.term} className="rounded-[4px] bg-surface-2 px-2.5 py-2">
          <dt className="text-[11px] text-fg-subtle">{item.term}</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">{item.desc}</dd>
        </div>
      ))}
    </dl>
  );
}
