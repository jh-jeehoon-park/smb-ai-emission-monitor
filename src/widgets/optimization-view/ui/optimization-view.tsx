'use client';

import { useMemo } from 'react';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { Panel } from '@/shared/ui/panel';
import { StatTile } from '@/shared/ui/stat-tile';
import { VALUE_LG, VALUE_MD } from '@/shared/ui/type-scale';
import { MeterBar } from '@/shared/ui/meter-bar';
import { energyIntensity, getMeasurementSeries, windowChange } from '@/entities/measurement';
import {
  CHEMICAL_SAVING_RANGE,
  DOSING_DECIMALS,
  ENERGY_DECIMALS,
  ENERGY_SAVING_TARGET,
  OPEX_SAVING_TARGET,
  OPERATING_WINDOW,
  OPTIMIZATION_INPUT_LABEL,
  getOptimization,
  type DosingAdvice,
  type OperatingAdvice,
} from '@/entities/optimization';
import { useSelectedSiteId } from '@/features/site-selection';
import { InfoTip } from '@/shared/ui/tooltip';

export function OptimizationView() {
  const { siteId } = useSelectedSiteId();

  /**
   * 에너지 효율은 계측에서 계산해 최적화 슬라이스에 넘긴다.
   * slice끼리 참조하지 않으므로(FSD §8) 두 도메인을 잇는 일은 위젯이 한다.
   */
  const summary = useMemo(() => {
    const series = getMeasurementSeries(siteId);
    const energyNow = energyIntensity(series);
    /*
     * 운전 조건의 방향·근거도 계측에서 온다 `[사용자 결정 2026-08-21]`. 예전에는 조정폭이
     * 난수였고 조정 이유가 사업장·시각과 무관한 고정 문장이라 계측을 본 판단처럼 읽혔다.
     */
    const { recentHours, baselineHours } = OPERATING_WINDOW;
    const signals = {
      dissolvedOxygen: windowChange(series, 'DO', recentHours, baselineHours),
      flow: windowChange(series, 'flow', recentHours, baselineHours),
    };
    return getOptimization(siteId, energyNow, signals);
  }, [siteId]);

  if (!summary.online) {
    return (
      <Panel title="운영 최적화">
        <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
          <p className={`num ${VALUE_LG} text-fg-subtle`}>—</p>
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

  return (
    <div className="space-y-6">
      {/*
       * **타일 다섯 칸** `[사용자 지시 2026-08-25]`. `kWh/m³` 카드가 값 두 개(현재·적용 시)와
       * 절감률뿐이라 패널 한 장을 채우지 못했다 — 같은 성질의 값이 이미 넷 있어 그 줄에 넣는다.
       * 그 자리에는 `설비 운전 조건 제안`이 들어가 두 칸이 다시 찬다.
       */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        {/*
         * 다섯 번째 칸 — **최적화를 적용했을 때의 값**. 나머지 넷이 "지금"과 "목표"라면
         * 이것은 그 사이의 값이라 같은 줄에 있어야 셋이 한눈에 비교된다.
         * 값이 없으면 0으로 채우지 않고 `—`로 둔다(E4·R19).
         */}
        <StatTile
          label="적용 시 에너지 효율"
          value={
            summary.energy.target === null
              ? '—'
              : `${summary.energy.target.toFixed(ENERGY_DECIMALS)}`
          }
          note={
            summary.energy.target === null
              ? '계측값이 없어 산출 불가'
              : `kWh/m³ · 현재 대비 −${summary.energy.savingRate}%`
          }
          accent={summary.energy.target === null ? undefined : statusInk(STATUS_VISUAL.normal)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="약품 주입량 최적화"
          titleAside={
            <InfoTip
              label="이 그래프를 읽는 법"
              content="현재 주입량과 권장 주입량을 같은 축의 막대로 겹쳐 봅니다."
            />
          }
        >
          <DosingCompare dosing={dosing} />
        </Panel>

        <Panel
          title="설비 운전 조건 제안"
          titleAside={
            <InfoTip
              label="이 값의 한계"
              content="계측에서 조정 방향을 내고, 절대 단위는 원문에 없어 상대 변화(%)로 표기합니다."
            />
          }
        >
          {summary.operating.length === 0 ? (
            /* 신호가 없으면 제안을 만들지 않는다 — 무엇이 없어서인지를 적는다(R19·E4) */
            <p className="py-3 text-[12px] leading-relaxed text-fg-subtle">
              최근 {OPERATING_WINDOW.recentHours}시간의 DO·유량 변화가 조정 문턱 아래이거나 표본이
              없어 조정을 권하지 않습니다. 값을 지어내 `0%`로 적으면 &ldquo;조정할 필요가 없다고
              판단했다&rdquo;는 말이 됩니다.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.operating.map((advice) => (
                <li key={advice.id}>
                  <OperatingRow advice={advice} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/*
       * **예상 비용 절감액 패널을 없앴다** `[회의 2026-08-20]`. 사업장별 약품 단가·계약 전력
       * 단가가 원문에 없어(`[TBD-41]`) 금액이 전부 원문 예시값이었고, 회의가 그 검증 불가를
       * 이유로 절감액 표시를 내리게 했다. **절감률 %는 남는다** — 원문 성과지표다.
       */}
      <Panel
        title="이 값이 나온 배경"
        titleAside={
          <InfoTip
            label="원문이 정하지 않은 것"
            content="약품 주입량의 단위·범위는 원문에 없어(계측 사양 p.55에 없고 AI 입력으로만 언급됨) 시연에서 L/h로 표기했습니다. 설비 수명 증가 목표는 같은 페이지 안에서 ≥15%와 ≥10%로 갈려 있어(INC-18) 화면에 넣지 않았습니다."
          />
        }
      >
        <dl className="grid grid-cols-1 gap-y-2 text-[12px]">
          <Meta label="산출 모델" value={`${summary.modelLabel} (다중 에이전트 강화학습)`} />
          <Meta
            label="산출 시각"
            value={`${formatDateTime(summary.computedAtIso)} ${DISPLAY_TIMEZONE}`}
            mono
          />
          <Meta label="입력 대상 기간" value={summary.inputWindowLabel} />
          <Meta label="입력 변수" value={OPTIMIZATION_INPUT_LABEL} />
        </dl>
      </Panel>
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
          <p className="text-[12px] text-fg-subtle">권장 주입량</p>
          <p className={`num mt-1 ${VALUE_LG}`} style={{ color: statusInk(STATUS_VISUAL.normal) }}>
            {dosing.recommendedDose.toFixed(DOSING_DECIMALS)}
            <span className="ml-1.5 text-[12px] font-normal text-fg-subtle">{dosing.unit}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-fg-subtle">현재</p>
          <p className={`num mt-1 ${VALUE_MD} text-fg-muted`}>
            {dosing.currentDose.toFixed(DOSING_DECIMALS)}
            <span className="ml-1 text-[12px] text-fg-subtle">{dosing.unit}</span>
          </p>
          <p className="num mt-1 text-[12px]" style={{ color: statusInk(STATUS_VISUAL.normal) }}>
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
        <p className="text-[12px] text-fg-subtle">권장 근거</p>
        <ul className="mt-1.5 space-y-1">
          {dosing.basis.map((reason) => (
            <li key={reason} className="flex gap-1.5 text-[12px] text-fg-muted">
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
  /* 막대는 통합 관제의 XAI 기여 막대와 **같은 부품**이다 `[사용자 지시 2026-08-24]` */
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[12px] text-fg-subtle">{label}</span>
      <MeterBar
        percent={(value / max) * 100}
        color={tone === 'normal' ? 'var(--normal)' : 'var(--missing)'}
        className="flex-1"
      />
      <span className="num w-[74px] shrink-0 text-right text-[12px] text-fg-muted">
        {value.toFixed(DOSING_DECIMALS)} {unit}
      </span>
    </div>
  );
}

function OperatingRow({ advice }: { advice: OperatingAdvice }) {
  const up = advice.deltaPercent > 0;
  const magnitude = Math.min(Math.abs(advice.deltaPercent), 20) * 5;
  const ink = statusInk(up ? STATUS_VISUAL.warning : STATUS_VISUAL.normal);

  /*
   * **제목 → 이유 → 관측값, 그 아래 전폭 막대** `[사용자 지시 2026-08-25]`.
   *
   * 예전에는 왼쪽 글 덩어리 · 가운데 120px 막대 · 오른쪽 델타로 가로 세 칸이었다. 넓은 화면에서
   * 가운데가 비고, 좁은 화면에서는 세 칸이 줄바꿈해 막대만 홀로 남았다.
   *
   * 알람 목록과 같은 규칙을 쓴다 — **무엇을 조정하는가**(제목)가 먼저, 왜(이유)와 무엇을 보고
   * (관측값)가 뒤, 크기·방향은 값과 막대가 함께 말한다.
   */
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-[14px] font-bold leading-snug text-fg">
          {advice.parameter}
          <span className="ml-2 text-[12px] font-normal text-fg-subtle">{advice.target}</span>
        </p>
        {/* 이 줄의 값이다 — 제목보다 크게 세워 조정 폭이 먼저 눈에 들어온다 */}
        <p className={`num shrink-0 ${VALUE_MD}`} style={{ color: ink }}>
          {up ? '+' : ''}
          {advice.deltaPercent}%
        </p>
      </div>

      <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-fg-muted">
        {advice.reason}
      </p>

      {/* 관측값을 먼저 적는다 — 계측을 근거로 말하려면 그 값이 화면에 있어야 한다(E3) */}
      <p className="num mt-1 text-[12px] leading-relaxed text-fg-subtle">{advice.observed}</p>

      {/* 방향과 크기를 같은 축의 막대로. 폭을 다 쓰므로 작은 차이도 길이로 읽힌다 */}
      <MeterBar
        className="mt-2"
        percent={magnitude}
        direction={up ? 'up' : 'down'}
        color={up ? 'var(--warning)' : 'var(--normal)'}
      />
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
