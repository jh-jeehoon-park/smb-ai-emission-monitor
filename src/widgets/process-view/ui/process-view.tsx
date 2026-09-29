'use client';

import { useMemo } from 'react';
import {
  PROVISIONAL_MEASUREMENT_GRADE_LABELS,
  type MeasurementGrade,
} from '@/shared/config/provisional';
import { AI_HEX, MEASUREMENT_GRADE_HEX } from '@/shared/config/status-visual';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { EQUIPMENT_SIGNAL_LABELS, getEquipment } from '@/entities/equipment';
import { useSiteSeries } from '@/entities/measurement';
import {
  ESTIMATED_ITEMS,
  OPTICAL_ITEMS,
  PROBE_ITEMS,
  REGULATED_ITEMS,
  STAGE_QUERY_KEY,
  getOperatingState,
} from '@/entities/process';
import { getSite } from '@/entities/site';
import {
  CHANNEL_STATE_LABELS,
  NO_STAGE_CODES_REASON,
  useProcess,
  type ResolvedStage,
} from '@/features/process-settings';
import { useSelectedSiteId } from '@/features/site-selection';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { formatValue } from '@/shared/lib/format';
import { pendingChannels, stageReadings } from '../lib/stage-readings';
import { ProcessDiagram } from './process-diagram';
import { InfoTip } from '@/shared/ui/tooltip';
import { TABLE_SCROLL } from '@/shared/ui/table';

/**
 * 이 시스템의 핵심 주장은 TMS 대체다 — 기존 방식은 공정 단계마다 분석기를 놓아 2~3억이
 * 들고(사업계획서 p.23·28), 본 시스템은 **두 점**에서 재고 AI가 나머지를 채워 5,000만이다.
 * 그 구조가 어느 화면에도 그림으로 없어 이 화면을 만들었다.
 *
 * **원문 FR에 근거가 없는 사용자 요구 화면이다**(docs/specs/README.md §3.1).
 */
export function ProcessView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);
  /* 그 사업장의 공정 목록. 단계·순서는 사업장 설정이 정한다 `[사용자 요청 2026-09-29]` */
  const { stages } = useProcess();

  /*
   * **허용 목록은 그 사업장의 단계다** — 사업장마다 단계를 더하고 빼므로 고정 목록이 없다.
   * 지운 단계가 URL에 남아 있으면 첫 단계로 떨어진다.
   */
  const stageIds = stages.map((s) => s.stage.id);
  const [stageId, setStageId] = useQueryState(STAGE_QUERY_KEY, stageIds, stageIds[0] ?? '');
  const selected = stages.find((s) => s.stage.id === stageId) ?? stages[0];

  /* 계측을 한 번만 읽어 도해·상세가 같은 계열을 본다 — JSX에서 부르면 단계마다 다시 만든다 */
  const { points, status: seriesStatus } = useSiteSeries(siteId);
  /*
   * **도해와 단계 상세만 계측을 읽는다** `[사용자 지적 2026-09-07]`. 첫 응답 전에는 노드마다
   * 값이 `—`로 찍혀 **계측 지점이 전부 결측인 공정**처럼 보였다 — 대기와 결측은 다른
   * 사실이다(**E4**). 상단의 가동·방류 줄은 시연 시나리오가 갖는 값이라 그대로 나온다.
   */
  const seriesPending = seriesStatus === 'pending';

  const operating = useMemo(() => getOperatingState(siteId), [siteId]);
  const equipment = useMemo(() => getEquipment(siteId), [siteId]);

  // 설비는 equipment slice가 갖는다. 공정은 배치만 알고 둘을 잇는 일은 여기서 한다(FSD §8)
  const stageEquipment = selected
    ? equipment.filter((e) => selected.stage.equipmentIds.includes(e.id))
    : [];

  /*
   * 단계를 다 지우면 그릴 것이 없다. 빈 SVG를 두면 고장으로 읽히므로 왜 비었는지 적는다
   * (R19) — 설정으로 되돌릴 수 있다는 것까지 말해야 막힌 화면이 되지 않는다.
   */
  if (!selected) {
    return (
      <Panel title="폐수처리 공정">
        <p className="mx-auto max-w-[64ch] py-8 text-center text-[12px] leading-relaxed text-fg-subtle">
          이 사업장에 공정 단계가 없습니다. 사업장 설정 &gt; 공정 구성에서 「단계 추가」로
          공정을 만들면 공정도를 그립니다.
        </p>
      </Panel>
    );
  }

  return (
    <StaggerGroup className="space-y-6">
      <RiseItem>
        <OperatingBar site={site.name} operating={operating} />
      </RiseItem>

      <RiseItem>
        <Panel
          title="폐수처리 공정"
          titleAside={
            <InfoTip
              label="이 공정도를 읽는 법"
              content="사업장마다 공정의 단계·순서가 다릅니다 — 사업장 설정 > 공정 구성에서 단계를 더하고 빼고 순서를 바꿉니다. 각 단계의 값은 그 단계에 건 ECP 채널에서 옵니다. «재이용»은 처리수 일부가 그 단계에서 제조공정으로 돌아간다는 표시이며 그 양은 계측하지 않습니다."
            />
          }
          action={<GradeLegend />}
          bodyClassName={TABLE_SCROLL}
        >
          <ProcessDiagram
            stages={stages}
            points={points}
            pending={seriesPending}
            selectedId={selected.stage.id}
            onSelect={setStageId}
          />
        </Panel>
      </RiseItem>

      <RiseItem>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <StageDetail
            resolved={selected}
            readings={stageReadings(points, selected)}
            pending={seriesPending}
            equipment={stageEquipment}
            online={site.online}
          />
          <DischargePoint />
        </div>
      </RiseItem>

      <RiseItem>
        <NotMeasured />
      </RiseItem>
    </StaggerGroup>
  );
}

function OperatingBar({
  site,
  operating,
}: {
  site: string;
  operating: ReturnType<typeof getOperatingState>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-panel border border-card-border bg-surface p-5 shadow-panel text-[12px]">
      <span className="text-fg-muted">{site}</span>

      <span className="flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: operating.running ? 'var(--normal)' : 'var(--missing)' }}
        />
        <span className={operating.running ? 'text-normal-ink' : 'text-fg-subtle'}>
          {operating.running ? '가동 중' : '가동 여부 알 수 없음'}
        </span>
      </span>

      <span className="flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: operating.discharging ? 'var(--actual)' : 'var(--missing)' }}
        />
        <span className={operating.discharging ? 'text-fg' : 'text-fg-subtle'}>
          {operating.discharging
            ? '방류 중'
            : operating.idleHours === null
              ? '방류 여부 알 수 없음'
              : `방류 없음 · ${operating.idleHours}시간째`}
        </span>
      </span>

      <span className="text-fg-subtle">{operating.pattern}</span>

      {!operating.discharging && operating.running && operating.idleHours !== null && (
        /* 간헐방류라 이 구분이 필요하다. 방류하지 않는 시간의 수질은 배출 수질이 아니다 */
        <span className="text-[12px] text-fg-subtle">
          방류 중이 아닐 때의 수질값은 배출 수질이 아닙니다
        </span>
      )}
    </div>
  );
}

function GradeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px]">
      {(['actual', 'estimated', 'none'] as MeasurementGrade[]).map((grade) => (
        <span key={grade} className="flex items-center gap-1.5 text-fg-subtle">
          <span
            className="inline-block h-0 w-4 border-t-2"
            style={{
              borderColor: MEASUREMENT_GRADE_HEX[grade],
              borderStyle: grade === 'actual' ? 'solid' : grade === 'estimated' ? 'dashed' : 'dotted',
            }}
          />
          {PROVISIONAL_MEASUREMENT_GRADE_LABELS[grade]}
        </span>
      ))}
    </div>
  );
}

function StageDetail({
  resolved,
  readings,
  pending,
  equipment,
  online,
}: {
  resolved: ResolvedStage;
  readings: ReturnType<typeof stageReadings>;
  /** 첫 응답 전인가. **설비 줄은 계측이 아니라 시나리오가 갖는다** — 여기 걸리지 않는다 */
  pending: boolean;
  equipment: ReturnType<typeof getEquipment>;
  online: boolean;
}) {
  const { stage } = resolved;
  const waiting = pendingChannels(resolved);
  /* 지점이 하나라도 있으면 «계측하지 않는 단계»가 아니다 — 값이 아직 오지 않을 뿐이다 */
  const unmeasured = stage.grade === 'none' && resolved.channels.length === 0;

  return (
    <Panel
      title={stage.name}
      /* 계측하지 않는 단계는 그 사실이 결함으로 읽히지 않게 이유를 함께 둔다 */
      titleAside={
        unmeasured ? (
          <InfoTip
            label="이 단계를 계측하지 않는 이유"
            content="전처리·침전 구간에 계측기가 적은 것은 이 시스템의 한계가 아니라 업계 표준입니다 — 계측은 제어가 필요한 곳과 법이 요구하는 곳에 몰립니다."
          />
        ) : undefined
      }
    >
      {stage.units.length > 0 && <p className="text-[12px] text-fg-muted">{stage.units.join(' · ')}</p>}
      {/*
       * **재이용 분기 표시** `[사용자 결정 2026-09-29: (가)]`. 처리수 일부가 여기서 제조공정으로
       * 돌아간다 — 그 양은 계측하지 않으므로 선을 그리지 않고 말로만 적는다.
       */}
      {resolved.reuseBranch && (
        <p className="mt-1.5 text-[12px] text-fg-subtle">
          처리수 일부가 이 단계에서 제조공정으로 재이용됩니다 — 재이용량은 계측하지 않습니다
        </p>
      )}

      {/*
       * **이 단계에서 재는 값.** 회의가 요구한 공정별 모니터링이다 `[회의 2026-08-20]`.
       * 설정하지 않았으면 이유를 적는다 — 빈 칸은 "재지 않는 단계"로 읽힌다.
       */}
      <div className="mt-3 border-t border-border pt-2.5">
        {readings.length === 0 && waiting.length === 0 && (
          <p className="text-[12px] leading-relaxed text-fg-subtle">{NO_STAGE_CODES_REASON}</p>
        )}
        {readings.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-3">
            {readings.map((reading) => (
              <div key={reading.code}>
                <dt className="text-[12px] text-fg-subtle">
                  {MEASUREMENT_ITEMS[reading.code].symbol}
                </dt>
                <dd className="num mt-0.5 text-fg">
                  {/*
                   * 결측을 0으로 채우지 않는다 — 그 지점이 0을 잰 것이 아니다(E4).
                   * **아직 안 받은 것을 `수신 없음`이라 적지도 않는다** — 확인된 부재의 말이다.
                   */}
                  {pending ? (
                    <Skeleton className="h-3.5 w-12" />
                  ) : (
                    <>
                      {reading.latest === null
                        ? '수신 없음'
                        : formatValue(reading.code, reading.latest)}
                      {reading.latest !== null && (
                        <span className="ml-1 text-[12px] font-normal text-fg-subtle">
                          {MEASUREMENT_ITEMS[reading.code].unit}
                        </span>
                      )}
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {/*
         * **값이 오지 않는 지점도 적는다** — 빼면 «이 단계는 그 항목을 재지 않는다»로 읽힌다.
         * 채널 미지정과 수신 연결 전은 할 일이 달라 말을 가른다.
         */}
        {waiting.length > 0 && (
          <dl className={cn('space-y-1.5 text-[12px]', readings.length > 0 && 'mt-3')}>
            {waiting.map((group) => (
              <div key={group.state} className="flex gap-3">
                <dt className="w-[88px] shrink-0 text-fg-subtle">
                  {CHANNEL_STATE_LABELS[group.state]}
                  <span className="num ml-1 text-fg-muted">{group.items.length}</span>
                </dt>
                <dd className="min-w-0 leading-relaxed text-fg-muted">
                  {group.items.map((item) => MEASUREMENT_ITEMS[item].symbol).join(' · ')}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <p
        className="mt-3 border-t border-border pt-2.5 text-[12px] leading-relaxed"
        style={{ color: MEASUREMENT_GRADE_HEX[stage.grade] }}
      >
        {stage.measurementNote}
      </p>

      {equipment.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-2.5">
          {equipment.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-fg">{item.name}</span>
              {/* 고장 확률이 있던 자리다. 회의가 예지보전을 내리게 해 이상 여부만 적는다 `[INC-107]` */}
              <span className="text-fg-subtle">
                {!online
                  ? '수신 없음'
                  : item.signals.length === 0
                    ? '이상 없음'
                    : item.signals.map((s) => EQUIPMENT_SIGNAL_LABELS[s]).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {unmeasured && (
        <p className="mt-3 rounded-nested bg-surface-2 px-2.5 py-2 text-[12px] text-fg-subtle">
          이 단계는 계측하지 않습니다.
        </p>
      )}
    </Panel>
  );
}

/** 우리가 실제로 재는 한 점. 여기서 법정 5항목이 완성된다 */
function DischargePoint() {
  return (
    <Panel title="계측 지점">
      <div className="space-y-3 text-[12px]">
        <div>
          <p className="text-[12px] text-fg-subtle">다항목 프로브 (단일 프로브 통합)</p>
          <p className="mt-1 text-fg">{PROBE_ITEMS.join(' · ')}</p>
        </div>
        <div>
          <p className="text-[12px] text-fg-subtle">광학 센서 (별도 모듈)</p>
          <p className="mt-1 text-fg">{OPTICAL_ITEMS.join(' · ')}</p>
        </div>
        <div className="border-t border-border pt-2.5">
          <p className="text-[12px]" style={{ color: AI_HEX }}>
            AI 추정 — 직접 재지 않는다
          </p>
          <p className="mt-1" style={{ color: AI_HEX }}>
            {ESTIMATED_ITEMS.join(' · ')}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-fg-subtle">
            T-N은 NO3-N·NH4-N·EC, T-P는 탁도·SS와의 상관에서 추정합니다. 정확도 T-N 88.6% · T-P
            78.2%.
          </p>
        </div>
        <div className="rounded-nested bg-surface-2 px-2.5 py-2">
          <p className="text-[12px] text-fg-subtle">법정 방류 기준 점검 대상</p>
          <p className="num mt-0.5 text-[12px] font-semibold text-fg">
            {REGULATED_ITEMS.join(' · ')}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/** 안 보이는 곳을 감추지 않는다. 시연에서 물어보기 전에 화면이 먼저 말한다 */
function NotMeasured() {
  return (
    <Panel title="이 화면이 재지 않는 것">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-nested bg-surface-2 px-2.5 py-2">
          <dt className="text-[12px] text-fg-subtle">송풍기 (폭기장치)</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
            예지보전 대상으로 원문이 다섯 번 언급하지만 무엇으로 재는지 규정이 없습니다. 개별
            신호가 규정된 설비는 약품주입펌프뿐입니다.
          </dd>
        </div>
        <div className="rounded-nested bg-surface-2 px-2.5 py-2">
          <dt className="text-[12px] text-fg-subtle">프로브 설치 지점</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
            원문에 설치 위치 서술이 없습니다. 어느 단계에서 무엇을 재는지는 사업장마다 ECP 채널을
            단계에 걸어 정합니다.
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
