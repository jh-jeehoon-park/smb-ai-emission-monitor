'use client';

import { useMemo } from 'react';
import {
  PROVISIONAL_MEASUREMENT_GRADE_LABELS,
  type MeasurementGrade,
} from '@/shared/config/provisional';
import { ACTUAL_HEX, AI_HEX, MISSING_HEX } from '@/shared/config/status-visual';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { getEquipment } from '@/entities/equipment';
import {
  ESTIMATED_ITEMS,
  OPTICAL_ITEMS,
  PROBE_ITEMS,
  REGULATED_ITEMS,
  STAGE_IDS,
  STAGE_QUERY_KEY,
  getOperatingState,
  getProcessStages,
} from '@/entities/process';
import { getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';
import { ProcessDiagram } from './process-diagram';

const GRADE_HEX: Record<MeasurementGrade, string> = {
  actual: ACTUAL_HEX,
  estimated: AI_HEX,
  none: MISSING_HEX,
};

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
  const stages = getProcessStages();

  const [stageId, setStageId] = useQueryState(STAGE_QUERY_KEY, STAGE_IDS, STAGE_IDS[0]!);
  const selected = stages.find((s) => s.id === stageId) ?? stages[0]!;

  const operating = useMemo(() => getOperatingState(siteId), [siteId]);
  const equipment = useMemo(() => getEquipment(siteId), [siteId]);

  // 설비는 equipment slice가 갖는다. 공정은 배치만 알고 둘을 잇는 일은 여기서 한다(FSD §8)
  const stageEquipment = equipment.filter((e) => selected.equipmentIds.includes(e.id));

  return (
    <StaggerGroup className="space-y-3">
      <RiseItem>
        <OperatingBar site={site.name} operating={operating} />
      </RiseItem>

      <RiseItem>
        <Panel
          eyebrow={`${site.name} · 표준 6단계`}
          title="폐수처리 공정"
          action={<GradeLegend />}
          bodyClassName="overflow-x-auto p-4"
        >
          <ProcessDiagram stages={stages} selectedId={selected.id} onSelect={setStageId} />
          <p className="mt-3 max-w-[92ch] border-t border-border pt-2.5 text-[12px] leading-relaxed text-fg-subtle">
            공정 구성은 사업장이 달라도 같습니다. 사업장마다 조금씩 다르지만 원문·데이터에 단계
            구성이 없습니다(TBD-44).
          </p>
        </Panel>
      </RiseItem>

      <RiseItem>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <StageDetail stage={selected} equipment={stageEquipment} online={site.online} />
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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[6px] border border-border bg-surface px-4 py-3 text-[12px]">
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

      {!operating.discharging && operating.running && (
        /* 간헐방류라 이 구분이 필요하다. 방류하지 않는 시간의 수질은 배출 수질이 아니다 */
        <span className="text-[11px] text-fg-subtle">
          방류 중이 아닐 때의 수질값은 배출 수질이 아닙니다
        </span>
      )}
    </div>
  );
}

function GradeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px]">
      {(['actual', 'estimated', 'none'] as MeasurementGrade[]).map((grade) => (
        <span key={grade} className="flex items-center gap-1.5 text-fg-subtle">
          <span
            className="inline-block h-0 w-4 border-t-2"
            style={{
              borderColor: GRADE_HEX[grade],
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
  stage,
  equipment,
  online,
}: {
  stage: ReturnType<typeof getProcessStages>[number];
  equipment: ReturnType<typeof getEquipment>;
  online: boolean;
}) {
  return (
    <Panel
      eyebrow={`${stage.order}단계 · ${PROVISIONAL_MEASUREMENT_GRADE_LABELS[stage.grade]}`}
      title={stage.name}
    >
      <p className="text-[12px] text-fg-muted">{stage.units.join(' · ')}</p>

      <p
        className="mt-3 border-t border-border pt-2.5 text-[12px] leading-relaxed"
        style={{ color: GRADE_HEX[stage.grade] }}
      >
        {stage.measurementNote}
      </p>

      {equipment.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-2.5">
          {equipment.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-fg">{item.name}</span>
              <span className="num text-fg-subtle">
                {online ? `고장 확률 ${item.failureProbability}%` : '수신 없음'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {stage.grade === 'none' && (
        <p className="mt-3 rounded-[4px] bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-fg-subtle">
          이 단계는 계측하지 않습니다. 전처리·침전 구간에 계측기가 적은 것은 이 시스템의 한계가
          아니라 업계 표준입니다 — 계측은 제어가 필요한 곳과 법이 요구하는 곳에 몰립니다.
        </p>
      )}
    </Panel>
  );
}

/** 우리가 실제로 재는 한 점. 여기서 법정 5항목이 완성된다 */
function DischargePoint() {
  return (
    <Panel eyebrow="6단계 · 실측" title="계측 지점">
      <div className="space-y-3 text-[12px]">
        <div>
          <p className="text-[11px] text-fg-subtle">다항목 프로브 (단일 프로브 통합)</p>
          <p className="mt-1 text-fg">{PROBE_ITEMS.join(' · ')}</p>
        </div>
        <div>
          <p className="text-[11px] text-fg-subtle">광학 센서 (별도 모듈)</p>
          <p className="mt-1 text-fg">{OPTICAL_ITEMS.join(' · ')}</p>
        </div>
        <div className="border-t border-border pt-2.5">
          <p className="text-[11px]" style={{ color: AI_HEX }}>
            AI 추정 — 직접 재지 않는다
          </p>
          <p className="mt-1" style={{ color: AI_HEX }}>
            {ESTIMATED_ITEMS.join(' · ')}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-subtle">
            T-N은 NO3-N·NH4-N·EC, T-P는 탁도·SS와의 상관에서 추정합니다. 정확도 T-N 88.6% · T-P
            78.2%.
          </p>
        </div>
        <div className="rounded-[4px] bg-surface-2 px-2.5 py-2">
          <p className="text-[11px] text-fg-subtle">법정 방류 기준 점검 대상</p>
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
    <Panel eyebrow="확인 필요" title="이 화면이 재지 않는 것">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[4px] bg-surface-2 px-2.5 py-2">
          <dt className="text-[11px] text-fg-subtle">송풍기 (폭기장치) · TBD-42</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
            예지보전 대상으로 원문이 다섯 번 언급하지만 무엇으로 재는지 규정이 없습니다. 개별
            신호가 규정된 설비는 약품주입펌프뿐입니다.
          </dd>
        </div>
        <div className="rounded-[4px] bg-surface-2 px-2.5 py-2">
          <dt className="text-[11px] text-fg-subtle">프로브 설치 지점 · TBD-43</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
            원문에 설치 위치 서술이 없습니다. 실증 데이터가 방류구 기준이라 6단계에 그렸습니다.
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
