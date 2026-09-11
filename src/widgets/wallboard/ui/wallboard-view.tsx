'use client';

import { useMemo } from 'react';
import { VOLUME_DECIMALS, VOLUME_UNIT } from '@/shared/config/constants';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { formatValue } from '@/shared/lib/format';
import { isDischargingAt } from '@/shared/lib/timeline';
import { countByPriorityIn, countOpen } from '@/entities/alarm';
import { getAnomalySummary } from '@/entities/anomaly';
import { getEquipment } from '@/entities/equipment';
import {
  WATER_SERIES_CODES,
  dailyDischargeSeries,
  dailyDischargeVolume,
  telemetrySourceLabel,
  useSiteSeries,
  type MeasurementPoint,
} from '@/entities/measurement';
import { getSite } from '@/entities/site';
import { allAlarmsForSite, useAlarmStates } from '@/features/alarm-ack';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  WALL_ALARM_ROWS,
  WALL_META,
  WALL_VALUE_LG,
  WALL_VALUE_XL,
} from '../config/constants';
import { useCountUp } from '../lib/use-count-up';
import { useValueFlash } from '../lib/use-value-flash';
import { AlarmTally } from './alarm-tally';
import { ContributionBars } from './contribution-bars';
import { EquipmentRows } from './equipment-rows';
import { QualityCell } from './quality-cell';
import { ScoreArc } from './score-arc';
import { WallHeader } from './wall-header';
import { WallPanel } from './wall-panel';
import { WallSpark } from './wall-spark';

/**
 * **현황판**(`SCR-AD-006`) — 사업장 사무실 벽의 TV에 띄워 두는 화면 `[사용자 요청 2026-09-10]`.
 *
 * 주관사 요구가 그대로 설계 제약이다: *"모니터에 그냥 띄어놓고 보지, 계속 움직이거나
 * 이동하는 것은 지양한다."* 그래서 이 화면은 **스크롤이 없고, 아무도 누르지 않으며,
 * 2~3m 밖에서 읽힌다.**
 *
 * ## 부품을 하나도 가져오지 않았다
 *
 * `[사용자 요청 2026-09-11: 기존의 컴포넌트를 활용하지 않고 새로 구축하며, 톤앤매너는
 * 유지하되 최대한 레퍼런스와 유사한 UI로 구성]`.
 *
 * `Panel`·`StatTile`·`MeterBar`·`Sparkline`·`CountUp`·`StaggerGroup`을 전부 쓰지 않고 이
 * 위젯 안에 다시 만들었다 — `WallPanel`(강조 틱 머리 띠) · `WallBar` · `WallSpark` ·
 * `ScoreArc` · `useCountUp` · `useValueFlash`. 공용 부품은 **60cm 앞의 화면**을 전제한
 * 여백·두께·글자라, 벽에서는 같은 자리에 다른 값이 필요하다.
 *
 * **토큰은 그대로다** — 색·모서리·그림자·hairline은 §8을 그대로 따르므로 톤앤매너가 유지된다.
 * 달라진 것은 **치수와 짜임**이고, 그것이 레퍼런스를 닮게 만드는 축이다.
 *
 * ## 새 데이터를 만들지 않는다
 *
 * `[사용자 확인 2026-09-10: 아직 어떠한 서비스를 구축할 것인지에 대한 확정이 안된 상태임으로
 * 현재 시스템의 톤앤매너로 어떻게 보여줄 수 있을 것에 대한 것이 중심이 됨]`.
 *
 * 여기 있는 값은 전부 다른 화면이 이미 보여 주는 것이다 — 이상 점수와 기여 변수(`/anomaly`) ·
 * 알람 집계(`/alarms`) · 누적 배출량(`/discharge`) · 수질 8종 · 설비 4대.
 *
 * ## 셸을 그리지 않는다
 *
 * `(shell)` 안에 있지만 `AppShell`이 이 경로에서만 사이드바·헤더를 그리지 않는다. 셸 밖
 * route group으로 나가면 메뉴 항목이 성립하지 않고, 전용 가드를 또 만들어야 하며,
 * `verify:docs` 검사 3의 «셸 라우트 수 = 메뉴 수»가 깨진다.
 */
export function WallboardView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);
  const limits = useDischargeLimits();

  const { points, status, failure, unreceived, observedAtIso } = useSiteSeries(siteId);
  const { alarms } = useAlarmStates(useMemo(() => allAlarmsForSite(siteId), [siteId]));

  const anomaly = useMemo(() => getAnomalySummary(siteId), [siteId]);
  const equipment = useMemo(() => getEquipment(siteId), [siteId]);
  const volume = useMemo(() => dailyDischargeVolume(points), [points]);
  const cumulative = useMemo(() => dailyDischargeSeries(points), [points]);

  /*
   * 벽에 올리는 알람은 **미확인 맨 위 몇 건**이다. 확인·조치된 것은 «지금 밀려 있는 것»이
   * 아니라 이력이고, 그 정본은 `/alarms`다. `allAlarmsForSite`가 이미 최신순이라 앞에서 자른다.
   */
  const recentAlarms = useMemo(
    () => alarms.filter((alarm) => alarm.state === 'open').slice(0, WALL_ALARM_ROWS),
    [alarms],
  );

  /* 서버가 `discharging`을 주지만 이상 탐지와 원천이 갈리지 않게 시나리오를 따른다 */
  const discharging = isDischargingAt(siteId, points.length - 1);

  /*
   * **맨 끝 표본이 아니라 «마지막으로 받은 값»을 쓴다.**
   *
   * 계측 서버가 우리 시간축보다 1분쯤 뒤에 써서 **맨 끝 칸이 늘 빈다** — 그대로 읽으면
   * 정상 수신 중인 사업장의 수위·유량이 종일 `수신 없음`으로 뜬다(캡처에서 드러났다).
   * 그것은 두절이 아니라 시간축의 사정이고, `SCR-AD-005` §7.5가 같은 함정을 이미 적어 두었다.
   *
   * **채널이 아예 없는 것과는 다르다** — 그쪽은 `unreceived`가 말하고 화면이 따로 적는다(**E4**).
   */
  const level = useMemo(() => lastKnown(points, 'level'), [points]);
  const flow = useMemo(() => lastKnown(points, 'flow'), [points]);

  const scoreVisual = anomaly.level ? STATUS_VISUAL[anomaly.level] : null;

  return (
    /*
     * **화면 하나에 딱 맞춘다.** `h-screen` + `overflow-hidden`이라 넘치는 것이 **잘려서 눈에
     * 띈다** — 스크롤로 흘려 보내면 «스크롤 없이 한 눈에»라는 요구가 조용히 깨진 채로 남는다.
     */
    <div className="flex h-screen flex-col gap-4 overflow-hidden bg-bg p-5">
      <WallHeader
        siteName={site.name}
        region={site.region}
        industry={site.industry}
        sourceLabel={telemetrySourceLabel(status, failure)}
        observedAtIso={observedAtIso}
      />

      {/*
       * 세 열 — 레퍼런스의 짜임이다. 왼쪽이 «지금 어떤 상태인가»(계기와 그 근거), 가운데가
       * 계측 격자, 오른쪽이 «무엇을 해야 하나»(알람·설비)다.
       */}
      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)_420px] gap-4">
        <div className="flex min-h-0 flex-col gap-4">
          <WallPanel
            title="이상 점수"
            aside={anomaly.modelLabel}
            bodyClassName="flex min-h-0 flex-col items-center justify-center p-3"
          >
            <ScoreArc score={anomaly.score} level={anomaly.level} />
            {/*
             * 계기 안이 아니라 **아래**에 적는다 — 반원 안쪽은 바늘이 지나는 자리라 숫자를
             * 넣으면 겹친다. 색만으로 말하지 않도록 등급 이름이 늘 곁에 있다(**E2**).
             */}
            <p className="-mt-3 flex items-baseline gap-2.5">
              {anomaly.score === null || scoreVisual === null ? (
                <span className={cn('text-fg-subtle', WALL_META)}>이상 점수 수신 없음</span>
              ) : (
                <>
                  <span
                    className={cn('num', WALL_VALUE_XL)}
                    style={{ color: statusInk(scoreVisual) }}
                  >
                    {anomaly.score}
                  </span>
                  <span
                    className="text-[22px] font-bold"
                    style={{ color: statusInk(scoreVisual) }}
                  >
                    {anomaly.level && PROVISIONAL_STATUS_LABELS[anomaly.level]}
                  </span>
                </>
              )}
            </p>
          </WallPanel>

          <WallPanel title="기여 변수" aside={anomaly.windowLabel} className="flex-1">
            <ContributionBars rows={anomaly.contributions} />
          </WallPanel>
        </div>

        <WallPanel
          title={`수질 ${WATER_SERIES_CODES.length}종`}
          aside="지금 값과 기준"
          bodyClassName="grid min-h-0 grid-cols-4 grid-rows-2 gap-3 p-3"
        >
          {WATER_SERIES_CODES.map((code) => (
            <QualityCell
              key={`${siteId}-${code}`}
              code={code}
              values={points.map((point) => point[code])}
              limits={limits.table}
            />
          ))}
        </WallPanel>

        <div className="flex min-h-0 flex-col gap-4">
          <WallPanel title="알람" aside="확인 필요" className="flex-1" bodyClassName="p-3">
            <AlarmTally
              open={countOpen(alarms)}
              byPriority={countByPriorityIn(alarms, 'open', siteId)}
              recent={recentAlarms}
            />
          </WallPanel>

          <WallPanel title="설비" aside={`${equipment.length}대`}>
            <EquipmentRows items={equipment} online={site.online} />
          </WallPanel>
        </div>
      </div>

      {/* 아래 띠 — 배출 축. 누적이 넓게 눕고 그 곁에 지금 값 셋이 선다 */}
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_260px_260px_260px] gap-4">
        <WallPanel
          title="금일 누적 배출량 추이"
          aside="자정부터"
          bodyClassName="flex flex-col gap-2 px-4 pb-3 pt-2"
        >
          <WallSpark values={cumulative.map((row) => row.m3)} />
          <p className={cn('flex justify-between text-fg-subtle', WALL_META)}>
            {/* 몇 개를 뺐는지 적는다 — 빼기만 하면 얼마나 비었는지 알 수 없다(E4) */}
            <span>{volume.missing > 0 ? `결측 ${volume.missing}건 제외` : '결측 없음'}</span>
            <span className="num">
              {flow === null
                ? '유량 수신 없음'
                : `${formatValue('flow', flow)} ${MEASUREMENT_ITEMS.flow.unit}`}
            </span>
          </p>
        </WallPanel>

        <BigCell
          title="금일 누적"
          value={volume.volumeM3}
          unit={VOLUME_UNIT}
          decimals={VOLUME_DECIMALS}
          note="자정부터"
        />

        <BigCell
          title="방류 수조 수위"
          value={unreceived.includes('level') ? null : level}
          unit={MEASUREMENT_ITEMS.level.unit}
          decimals={MEASUREMENT_ITEMS.level.decimals}
          note={unreceived.includes('level') ? '채널 없음 [TBD-57]' : '지금'}
        />

        <WallPanel title="방류 상태" bodyClassName="flex flex-col justify-center p-4">
          {/* 방류 여부는 셋이다 — 하고 있다 · 안 하고 있다 · 모른다. 셋째를 둘째와 섞지 않는다(E4) */}
          <p
            className={cn(
              WALL_VALUE_LG,
              discharging === null ? 'text-fg-subtle' : 'text-fg',
            )}
          >
            {discharging === null ? '판정 불가' : discharging ? '방류 중' : '방류 없음'}
          </p>
          <p className={cn('mt-2 text-fg-subtle', WALL_META)}>
            {discharging === null ? '수신이 없어 판정할 수 없습니다' : '지금'}
          </p>
        </WallPanel>
      </div>
    </div>
  );
}

/**
 * 마지막으로 **받은** 값. 꼬리가 비었다고 «없다»가 아니다 — 위 주석 참조.
 */
function lastKnown(points: MeasurementPoint[], code: 'level' | 'flow'): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i]?.[code];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

/**
 * 큰 수 한 칸 — 레퍼런스의 «값 하나짜리 타일».
 *
 * **바뀌면 그 칸이 한 번 밝아지고 숫자가 직전 값에서 흘러간다.** 새 무한 반복이 아니다 —
 * `motion.tsx`가 적어 둔 *"값이 바뀔 때만 움직인다"* 그대로다.
 */
function BigCell({
  title,
  value,
  unit,
  decimals,
  note,
}: {
  title: string;
  value: number | null;
  unit: string;
  decimals: number;
  note: string;
}) {
  const flashing = useValueFlash(value);
  const shown = useCountUp(value ?? 0, decimals);

  return (
    <WallPanel
      title={title}
      bodyClassName={cn(
        'flex flex-col justify-center p-4 transition-colors duration-500',
        flashing && 'bg-accent-weak',
      )}
    >
      {value === null ? (
        /* 결측은 «0»이 아니라 모름이다 — 0으로 적으면 «안 내보냈다»는 사실 주장이 된다(E4) */
        <p className={cn('text-fg-subtle', WALL_VALUE_LG)}>수신 없음</p>
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span className={cn('num text-fg', WALL_VALUE_XL)}>{shown}</span>
          <span className="text-[16px] font-medium text-fg-muted">{unit}</span>
        </p>
      )}
      <p className={cn('mt-2 text-fg-subtle', WALL_META)}>{note}</p>
    </WallPanel>
  );
}
