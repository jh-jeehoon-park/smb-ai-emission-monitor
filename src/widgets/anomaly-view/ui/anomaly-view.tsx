'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { buildAnomalyScores, downsample } from '@/shared/lib/anomaly-score';
import { cn } from '@/shared/lib/cn';
import { getOutageWindow } from '@/shared/lib/timeline';
import Link from 'next/link';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { Panel } from '@/shared/ui/panel';
import { Sparkline } from '@/shared/ui/sparkline';
import { getAlarmsForView } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary, findIdleDischargeRuns } from '@/entities/anomaly';
import { getMeasurementSeries } from '@/entities/measurement';
import { SITES, getSite } from '@/entities/site';
import type { Site } from '@/entities/site';
import { useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { IdleDischargePanel } from './idle-discharge-panel';

const RANKING_SPARK_POINTS = 40;

export function AnomalyView() {
  const { siteId, setSiteId } = useSelectedSiteId();
  const withSite = useSiteHref();
  const site = getSite(siteId);

  const detail = useMemo(
    () => ({
      series: getAnomalySeries(siteId),
      summary: getAnomalySummary(siteId),
      outage: getOutageWindow(siteId),
      points: getMeasurementSeries(siteId),
      idleRuns: findIdleDischargeRuns(siteId),
      alarms: getAlarmsForView(siteId).filter((a) => a.condition === 'anomaly'),
    }),
    [siteId],
  );

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <Panel
          eyebrow={`AutoEncoder · ${site.name}`}
          title="이상 점수 타임라인"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <AnomalyBandLegend />
              {/* 원문 p.22의 현장 문제 — "TOC가 상승했는데 펌프 이상인지 유입 부하 증가인지
                  판단 어려움". 어느 공정 단계인지 짚으려면 공정도로 갈 수 있어야 한다 */}
              <Link
                href={withSite('/process')}
                className="text-[12px] text-fg-subtle underline decoration-border-strong underline-offset-2 transition-colors duration-200 hover:text-fg"
              >
                공정에서 보기
              </Link>
            </div>
          }
        >
          <AnomalyTimeline data={detail.series} outage={detail.outage} />
        </Panel>

        {/*
          * 이상 점수와 **다른 축**의 탐지다 — 점수가 낮아도 여기서 잡힌다.
          * 발표 p.11 그림이 이 기능을 `이상배출 조기탐지` 그룹에 두었기에 같은 화면에 둔다.
          */}
        <Panel
          eyebrow={`의심 구간 ${detail.idleRuns.length}건`}
          title="방지시설 미가동 중 방류 의심"
        >
          <IdleDischargePanel siteId={siteId} points={detail.points} />
        </Panel>

        {/* 비교가 이 블록의 존재 이유다. 자사 1개소뿐인 사업장에는 성립하지 않는다 */}
        <Panel
          eyebrow={`실증 ${SITES.length}개소`}
          title="사업장별 이상 점수"
          action={<span className="text-[12px] text-fg-subtle">점수 높은 순 · 클릭하여 전환</span>}
          bodyClassName="p-0"
          className="role-hide-site"
        >
          <SiteScoreRanking selectedId={siteId} onSelect={setSiteId} />
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel eyebrow={site.name} title="이상 탐지 결과">
          <AnomalyPanel summary={detail.summary} />
        </Panel>

        <Panel
          eyebrow={`이상 탐지 조건 ${detail.alarms.length}건`}
          title="관련 알람"
          bodyClassName="px-4 py-3"
        >
          <AlarmList alarms={detail.alarms} nowIso={DEMO_NOW_ISO} selectedSiteId={siteId} />
        </Panel>
      </div>
    </div>
  );
}

/**
 * 한 사업장만 보면 그 점수가 높은 건지 알 수 없다. 통합 관제의 판단은 늘 비교다.
 * 통신이 끊긴 사업장은 점수를 0으로 내리지 않고 목록 끝에 '수신 없음'으로 남긴다(E4).
 */
function SiteScoreRanking({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(() => {
    const scored = SITES.map((site) => ({
      site,
      spark: downsample(buildAnomalyScores(site.id), RANKING_SPARK_POINTS),
    }));

    return scored.sort((a, b) => {
      if (a.site.anomalyScore === null) return 1;
      if (b.site.anomalyScore === null) return -1;
      return b.site.anomalyScore - a.site.anomalyScore;
    });
  }, []);

  return (
    <ul className="divide-y divide-border">
      {rows.map(({ site, spark }) => (
        <li key={site.id}>
          <RankingRow
            site={site}
            spark={spark}
            selected={site.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

function RankingRow({
  site,
  spark,
  selected,
  onSelect,
}: {
  site: Site;
  spark: (number | null)[];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const visual = site.status ? STATUS_VISUAL[site.status] : null;
  const ink = visual ? statusInk(visual) : 'var(--fg-subtle)';

  return (
    <button
      type="button"
      onClick={() => onSelect(site.id)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left',
        'transition-colors duration-200 hover:bg-surface-2',
        selected && 'bg-surface-2',
      )}
    >
      <span
        aria-hidden
        className="h-7 w-[3px] shrink-0 rounded-full"
        style={{ backgroundColor: visual ? visual.hex : 'var(--missing)' }}
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] text-fg">{site.name}</span>
        <span className="block truncate text-[11px] text-fg-subtle">
          {site.region} · {site.industry}
        </span>
      </span>

      <Sparkline
        values={spark}
        color={visual ? visual.hex : 'var(--missing)'}
        width={84}
        height={22}
        className="hidden shrink-0 sm:block"
      />

      <span className="w-[86px] shrink-0 text-right">
        <span className="num block text-[15px] font-semibold leading-none" style={{ color: ink }}>
          {site.anomalyScore ?? '—'}
        </span>
        <span className="block text-[11px]" style={{ color: ink }}>
          {site.status ? PROVISIONAL_STATUS_LABELS[site.status] : '수신 없음'}
        </span>
      </span>
    </button>
  );
}
