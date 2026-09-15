'use client';

import { useMemo } from 'react';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { countOpen } from '@/entities/alarm';
import { getAnomalySummary } from '@/entities/anomaly';
import { dischargingAt, telemetrySourceLabel, useSiteSeries } from '@/entities/measurement';
import { getSite } from '@/entities/site';
import { allAlarmsForSite, useAlarmStates } from '@/features/alarm-ack';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { buildCompare } from '../lib/point-readings';
import { buildRunBands } from '../lib/run-bands';
import { CompareTable } from './compare-table';
import { DutyLanes } from './duty-lanes';
import { FlowAside } from './flow-aside';
import { QualityRows } from './quality-rows';
import { SectionPanel } from './section-panel';
import { TreatmentScale, TreatmentVerdictBand } from './treatment-scale';
import { VerdictBar } from './verdict-bar';

/**
 * **유입·유출 비교**(SCR-AD-005) — 관제 묶음 4번째 `[사용자 요청 2026-09-10]`.
 *
 * **이 화면이 묻는 것은 «처리가 됐는가»이고 증거는 두 지점의 수질 차이다.**
 * `[회의 2026-09-08]`이 *"단일 프로브는 공정별로 부착되지 않고 유입·유출에 부착된다.
 * 유입·유출 센서값이 동일할 경우 공정 처리 과정 중 문제가 있는 것"* 으로 전제를 정했다.
 *
 * **물의 양이 축이 아니다** `[사용자 지적 2026-09-10: 유입 유출의 방류량이 중요한 것이 아닌 …
 * 유출 때도 수질이 동일하다면 공정에 문제가 있는 것]`. 들어온 만큼 나가는 것은 정상이라
 * 양은 처리 여부를 말하지 않는다 — 앞 판본이 유량을 히어로로 세운 것은 «유입 수질 채널이
 * 서버에 없다»는 **데이터 사정**을 근거 자리에 놓은 것이었다. 지금 유입 수질은 시연 계열로
 * 만들고 화면이 항목마다 그 사실을 밝힌다 `[TBD-59]`.
 *
 * **단계 도해를 주인공으로 세우지 않는다.** 그것은 «어디서 무엇을 재는가»이고 `/process`의
 * 주제다 — 그 함정을 이미 두 번 밟아 화면을 폐기했고(`SCR-AD-004`), 이 화면의 첫 판본이
 * 세 번째였다 `[사용자 지적 2026-09-10]`.
 *
 * **부품을 공용에서 가져오지 않고 새로 만들었다** `[사용자 요청 2026-09-10]` —
 * `VerdictBar`(카드가 아닌 띠) · `TreatmentScale`(반원 게이지 카드 격자) · `GaugeArc`(세 호) ·
 * `SummaryDonut` · `FlowAside`(마주 보는 두 기둥) · `TrendRail`(평균선이 있는 추이) ·
 * `DutyLanes`(두 줄 대조) · `QualityRows`(줄 목록).
 *
 * **그런데 격자·카드 껍데기는 새로 만들지 않았다** — `water-quality-grid`의 값을 그대로 쓴다
 * (`@container` · `grid-cols-2 @[560px]:grid-cols-4` · `h-full rounded-nested`). 껍데기까지
 * 새로 만들면 같은 저장소에 카드가 두 종류가 되고, 그것은 이 요청이 막으려던 «어휘 확산»과
 * 같은 종류의 손해다. **새로 만든 것은 그 안의 그림이다.**
 *
 * 계측은 `useSiteSeries` **한 번만** 읽는다.
 */
export function InOutCompareView() {
  const { siteId } = useSelectedSiteId();
  const withSite = useSiteHref();
  const site = getSite(siteId);
  /* 사용자가 설정한 기준치가 정적 표를 덮어쓴다 — 같은 항목이 화면마다 다르게 판정되지 않게 */
  const limits = useDischargeLimits();

  const { points, discharging: liveDischarging, status, failure, unreceived, observedAtIso } =
    useSiteSeries(siteId);
  const pending = status === 'pending';

  const compare = useMemo(
    () => buildCompare(points, unreceived, limits.table),
    [points, unreceived, limits.table],
  );
  const bands = useMemo(() => buildRunBands(siteId), [siteId]);
  const anomaly = useMemo(() => getAnomalySummary(siteId), [siteId]);
  const { alarms } = useAlarmStates(useMemo(() => allAlarmsForSite(siteId), [siteId]));

  return (
    <StaggerGroup className="space-y-5">
      {/*
       * **현재 상태 한 상자** `[사용자 지적 2026-09-10: «91 위험»과 «처리 미흡 의심»의 연결이
       * 약하다]`.
       *
       * 둘이 각자 패널을 갖고 떨어져 있어 서로 무관해 보였다 — 지금은 **한 상자 안에서
       * hairline 하나로만 갈린다.** 위가 이 사업장의 등급, 아래가 이 화면의 판정이고, 둘 다
       * «지금 상태»라는 것이 자리로 읽힌다. **내용은 한 글자도 바뀌지 않았다** — 옮긴 것은
       * 상자 경계뿐이다.
       */}
      <RiseItem>
        <div className="overflow-hidden rounded-panel border border-card-border bg-surface shadow-panel">
          <VerdictBar
            siteName={site.name}
            score={anomaly.score}
            level={anomaly.level}
            openAlarms={countOpen(alarms)}
            sourceLabel={telemetrySourceLabel(status, failure)}
            observedAtIso={observedAtIso}
            modelLabel={anomaly.modelLabel}
            windowLabel={anomaly.windowLabel}
            computedAtIso={anomaly.computedAtIso}
            pending={pending}
            detailHref={withSite('/overview')}
            embedded
          />
          <div className="border-t border-border bg-surface-2">
            <TreatmentVerdictBand compare={compare} pending={pending} />
          </div>
        </div>
      </RiseItem>

      <RiseItem>
        <TreatmentScale compare={compare} pending={pending} siteId={siteId} />
      </RiseItem>

      <RiseItem>
        <FlowAside
          compare={compare}
          pending={pending}
          /* 실측이면 서버 값, 폴백이면 시나리오 — 규칙은 `dischargingAt` 한 곳이다 */
          dischargingNow={dischargingAt(siteId, liveDischarging, points.length - 1)}
        />
      </RiseItem>

      <RiseItem>
        <DutyLanes bands={bands} observedAtIso={observedAtIso} anomalyHref={withSite('/anomaly')} />
      </RiseItem>

      {/*
       * AI 추정은 **대조 줄에 들어가지 않는다** — 유입 짝이 없어 «얼마나 달라졌는가»를 낼 수
       * 없고, 억지로 한 열만 채우면 판정 대상처럼 읽힌다. 직접 재지 않는 값이라는 사실을
       * 제목이 적는다(**E3**).
       */}
      {/*
       * **AI 추정이 계측과 섞여 보이지 않게 한다** `[사용자 요청 2026-09-10: AI 추정이라는
       * 성격이 명확하게 구분되도록 UI 계층만 개선]`.
       *
       * 계층으로 가른다 — `AI 추정` 머리 띠를 옅은 면에 얹고 hairline으로 값과 끊는다.
       * 값·항목·기준은 하나도 바꾸지 않았다. 계열색은 이미 `--ai`라 색은 그대로다(**E3**).
       */}
      <RiseItem>
        <SectionPanel
          title="AI 추정"
          aside={
            <p className="text-[12px] text-fg-subtle">
              직접 재지 않습니다 — 소프트 센싱이 낼 값입니다
            </p>
          }
        >
          <QualityRows title="유출수" rows={compare.estimates} pending={pending} />
        </SectionPanel>
      </RiseItem>

      <RiseItem>
        <CompareTable compare={compare} />
      </RiseItem>
    </StaggerGroup>
  );
}
