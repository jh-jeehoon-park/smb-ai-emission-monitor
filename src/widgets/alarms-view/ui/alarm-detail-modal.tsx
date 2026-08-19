'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime, formatRelative, formatValue } from '@/shared/lib/format';
import { isDischargingAt, isTreatmentIdleAt, timelineIndexAt } from '@/shared/lib/timeline';
import { Modal, ModalFact, ModalFacts } from '@/shared/ui/modal';
import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  raisedWhileNotDischarging,
  type Alarm,
  type AlarmState,
} from '@/entities/alarm';
import { getMeasurementSeries, type SeriesCode } from '@/entities/measurement';
import { AlarmStateActions } from '@/features/alarm-ack';
import { SNAPSHOT_CODES } from '../config/constants';

interface AlarmDetailModalProps {
  alarm: Alarm | null;
  onClose: () => void;
  onChange: (id: string, next: AlarmState) => void;
}

/**
 * 알람 상세 — **알람이 왜 났는지를 한 자리에 모은다.**
 *
 * 목록은 제목과 한 줄 설명까지만 보여 준다. 그 알람이 난 시각에 계측값이 어땠는지,
 * 그때 방류 중이었는지는 다른 화면으로 가야 알 수 있었다.
 *
 * **조치 가이드 문구를 넣지 않는다** — 원문에 원천이 없다(REQ-AD-021 `[TBD]`). 그럴듯한
 * 문장을 지어 넣으면 검증된 대응 절차처럼 읽힌다.
 *
 * **기여 변수(XAI)도 넣지 않는다** — 지금 구할 수 있는 값은 *현재* 기준이라 몇 시간 전
 * 알람에 붙이면 그 시각의 근거인 것처럼 보인다(E3). 시각별 산출이 생기면 그때 넣는다.
 */
export function AlarmDetailModal({ alarm, onClose, onChange }: AlarmDetailModalProps) {
  const snapshot = useMemo(() => (alarm ? buildSnapshot(alarm) : null), [alarm]);

  /*
   * **닫혔을 때도 `Modal`을 마운트해 둔다.** 통째로 없애면 Radix가 포커스를 되돌릴 대상을
   * 잃어, ESC로 닫은 뒤 포커스가 문서 맨 위로 튄다(키보드 사용자가 목록 위치를 잃는다).
   * 본문만 알람이 있을 때 그린다.
   */
  if (!alarm || !snapshot) {
    return <Modal open={false} onOpenChange={onClose} title="" />;
  }

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      eyebrow={`${ALARM_PRIORITY_LABELS[alarm.priority]} · ${ALARM_CONDITION_LABELS[alarm.condition]}`}
      title={alarm.title}
      footer={
        <>
          <span className="mr-auto text-[11px] text-fg-subtle">
            상태 {ALARM_STATE_LABELS[alarm.state]}
          </span>
          <AlarmStateActions alarm={alarm} onChange={onChange} />
        </>
      }
    >
      <p className="max-w-[60ch] text-[12px] leading-relaxed text-fg-muted">{alarm.detail}</p>

      <div className="mt-4 border-t border-border pt-3">
        <ModalFacts>
          <ModalFact label="사업장" value={alarm.siteName} />
          {/* 등급은 우선순위와 다른 축이다 — 추정 매핑으로 이어져 있다 `[INC-02]` */}
          <ModalFact
            label="상태 등급"
            value={`${PROVISIONAL_STATUS_LABELS[alarm.level]} (우선순위 ${ALARM_PRIORITY_LABELS[alarm.priority]})`}
          />
          <ModalFact
            label="발생 시각"
            value={`${formatDateTime(alarm.raisedAtIso)} ${DISPLAY_TIMEZONE} · ${formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)}`}
            mono
          />
          <ModalFact label="방류 상태" value={<DischargeFact alarm={alarm} state={snapshot.discharging} />} />
          <ModalFact label="방지시설" value={idleLabel(snapshot.treatmentIdle)} />
        </ModalFacts>
      </div>

      {/*
       * 발생 시각의 계측값이다. 현재값을 보여 주면 몇 시간 전 알람에 지금 숫자가 붙어
       * "이 값 때문에 알람이 났다"로 읽힌다(E3).
       */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-[11px] text-fg-subtle">
          발생 시각 계측값 · {COLLECTION_INTERVAL_MINUTES}분 주기 표본
        </p>
        {snapshot.missing ? (
          <p className="text-[12px] text-fg-subtle">
            그 시각 수신값이 없습니다 — 값을 앞뒤에서 끌어오지 않습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {snapshot.values.map(({ code, value }) => (
              <li key={code} className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className="text-fg-subtle">{MEASUREMENT_ITEMS[code].symbol}</span>
                <span className="num text-fg">
                  {formatValue(code, value)}
                  <span className="ml-1 text-[11px] text-fg-subtle">
                    {MEASUREMENT_ITEMS[code].unit}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/**
 * 방류 여부는 모든 알람에 적는다. 다만 **주의 색은 수질 알람일 때만** 준다 —
 * 방류하지 않는 동안의 수질값은 배출 수질이 아니라 배출기준 초과로 오독되기 때문이고,
 * 설비 알람에는 그 오독이 성립하지 않는다. 목록의 `비방류 중 발생` 배지와 같은 규칙이다.
 */
function DischargeFact({ alarm, state }: { alarm: Alarm; state: boolean | null }) {
  if (state === null) return <span className="text-fg-subtle">수신 없음</span>;
  if (state) return <span>방류 중</span>;

  const misreadable = raisedWhileNotDischarging(alarm);
  return (
    <span style={misreadable ? { color: statusInk(STATUS_VISUAL.caution) } : undefined}>
      비방류 중{misreadable && ' — 이 값은 배출 수질이 아니다'}
    </span>
  );
}

function idleLabel(idle: boolean | null): string {
  if (idle === null) return '수신 없음';
  return idle ? '미가동 — 유입펌프 전류 없음' : '가동 중';
}

interface Snapshot {
  values: { code: SeriesCode; value: number | null }[];
  missing: boolean;
  discharging: boolean | null;
  treatmentIdle: boolean | null;
}

function buildSnapshot(alarm: Alarm): Snapshot {
  const index = timelineIndexAt(alarm.raisedAtIso);
  const point = getMeasurementSeries(alarm.siteId)[index];
  const values = SNAPSHOT_CODES.map((code) => ({
    code: code as SeriesCode,
    value: point?.[code] ?? null,
  }));

  return {
    values,
    missing: values.every((v) => v.value === null),
    discharging: isDischargingAt(alarm.siteId, index),
    treatmentIdle: isTreatmentIdleAt(alarm.siteId, index),
  };
}
