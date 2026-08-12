'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { FORECAST_HORIZON_HOURS } from '@/shared/config/measurement';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import {
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  TREND_LABELS,
  getForecast,
  type ForecastTargetCode,
  type TrendEstimate,
} from '@/entities/prediction';
import { getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { ForecastChart } from '@/widgets/forecast-chart';
import { TARGET_QUERY_KEY } from '../config/constants';

const TARGET_OPTIONS = FORECAST_TARGET_CODES.map((code) => ({ value: code, label: code }));
const DEFAULT_TARGET: ForecastTargetCode = 'TOC';

export function PredictionView() {
  const { siteId } = useSelectedSiteId();
  const [target, setTarget] = useQueryState(
    TARGET_QUERY_KEY,
    FORECAST_TARGET_CODES,
    DEFAULT_TARGET,
  );
  const site = getSite(siteId);
  const forecast = useMemo(() => getForecast(siteId, target), [siteId, target]);
  const profile = FORECAST_TARGETS[target];

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${forecast.modelLabel} · ${site.name}`}
        title={`${forecast.targetLabel} · 향후 ${FORECAST_HORIZON_HOURS}시간 예측`}
        action={
          <SegmentedControl
            ariaLabel="예측 대상 항목"
            options={TARGET_OPTIONS}
            value={target}
            onChange={setTarget}
          />
        }
      >
        <ForecastChart summary={forecast} nowIso={DEMO_NOW_ISO} />

        {/* AI 산출값은 언제·무엇을 근거로 나왔는지 값과 함께 보여야 한다(E3) */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-[11px] sm:grid-cols-4">
          <Meta label="산출 모델" value={forecast.modelLabel} />
          <Meta label="입력 대상 기간" value={forecast.inputWindowLabel} />
          <Meta
            label="산출 시각"
            value={
              forecast.online
                ? `${formatDateTime(forecast.computedAtIso)} ${DISPLAY_TIMEZONE}`
                : `중단 · 마지막 ${formatDateTime(forecast.computedAtIso)} ${DISPLAY_TIMEZONE}`
            }
            mono
          />
          <Meta label="결정계수 R²" value={profile.r2.toFixed(2)} mono />
        </dl>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-3">
        {forecast.trends.map((trend) => (
          <TrendCard
            key={trend.code}
            trend={trend}
            online={forecast.online}
            selected={trend.code === target}
            onSelect={() => setTarget(trend.code as ForecastTargetCode)}
          />
        ))}
      </div>

      <Panel eyebrow="Soft Sensing" title="추정 대상과 계측 대상">
        <p className="max-w-[86ch] text-[12px] leading-relaxed text-fg-muted">
          TOC는 센서로 직접 계측하면서 동시에 예측하고,{' '}
          <strong className="text-fg">TN·TP는 계측 센서가 없어 AI 추정만 존재한다</strong>(발표자료
          p.17). 세 항목의 경향은 어느 항목을 보고 있든 함께 표시하며, 값은 각 항목의 예측 마지막
          지점에서 가져온다. 통신이 두절되면 추정도 중단되며 마지막 산출 시각만 남는다 — 값을 임의로
          이어 붙이지 않는다(E3).
        </p>
      </Panel>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={mono ? 'num mt-0.5 text-fg-muted' : 'mt-0.5 text-fg-muted'}>{value}</dd>
    </div>
  );
}

function TrendCard({
  trend,
  online,
  selected,
  onSelect,
}: {
  trend: TrendEstimate;
  online: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const rising = trend.trend === 'rising';
  const ink = rising ? statusInk(STATUS_VISUAL.warning) : 'var(--fg-muted)';

  return (
    <Panel
      eyebrow={trend.label}
      title={trend.code}
      className={selected ? 'border-border-strong' : undefined}
      action={
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="cursor-pointer rounded-[3px] border border-border px-2 py-1 text-[11px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:text-fg"
        >
          {selected ? '보는 중' : '차트 보기'}
        </button>
      }
    >
      <div className="flex items-end justify-between gap-3">
        <p className="num text-[28px] font-semibold leading-none tracking-tight text-fg">
          {online
            ? trend.value.toFixed(FORECAST_TARGETS[trend.code as ForecastTargetCode].decimals)
            : '—'}
          <span className="ml-1.5 text-[11px] font-normal text-fg-subtle">{trend.unit}</span>
        </p>
        <p className="text-[12px]" style={{ color: ink }}>
          <span aria-hidden className="mr-1">
            {rising ? '▲' : trend.trend === 'falling' ? '▼' : '—'}
          </span>
          {TREND_LABELS[trend.trend]}
        </p>
      </div>
      <p className="num mt-2 text-[11px] text-fg-subtle">R² {trend.r2.toFixed(2)} · AI 추정값</p>
    </Panel>
  );
}
