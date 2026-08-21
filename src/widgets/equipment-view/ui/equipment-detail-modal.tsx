'use client';

import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { DISPLAY_TIMEZONE, formatDateTime, formatRelative } from '@/shared/lib/format';
import { Modal, ModalFact, ModalFacts } from '@/shared/ui/modal';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ALARM_PRIORITY_LABELS, type Alarm } from '@/entities/alarm';
import { EQUIPMENT_SIGNAL_LABELS, type Equipment } from '@/entities/equipment';

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  alarms: Alarm[];
  onClose: () => void;
}

/**
 * 설비 상세.
 *
 * 카드가 이상 여부와 가동 상태를 보여 주므로, 모달이 더하는 것은 **그것을 어떻게 읽어야
 * 하는지**다 — 어떤 신호가 언제부터 걸렸는지, 누적 운전시간, 그 설비에 걸린 알람.
 *
 * **고장 확률·잔여 수명·MPI가 없다** `[회의 2026-08-20]` `[INC-107]`. 예지보전이 어렵다는
 * 판단이라 값 자체를 내리고 이상 탐지로 바꿨다.
 *
 * 원문에 없는 것을 채우지 않는다 — 유지관리 이력·교체 주기·조치 절차는 저장소도 원천도 없다
 * (REQ-AD-019·021 `[TBD]`).
 */
export function EquipmentDetailModal({
  equipment,
  alarms,
  onClose,
}: EquipmentDetailModalProps) {
  if (!equipment) {
    return <Modal open={false} onOpenChange={onClose} title="" />;
  }

  /*
   * 알람에 설비 식별자가 없어 **제목 문자열로 잇는다.** 원문이 알람 스키마를 정하지 않았고
   * (TBD-05 상태 라이프사이클까지만 있다) 설비 ID를 실을 자리가 없다.
   *
   * 그래서 이 연결은 **못 찾을 수는 있어도 남의 설비를 끌어오지는 않는다** — 설비명이 제목에
   * 그대로 들어간 알람만 잡힌다. 놓친 알람은 아래 `0건` 문구로 드러나고, 알람 이력 화면에는
   * 그대로 남아 있다. 백엔드가 `equipmentId`를 주면 그것으로 바꾼다.
   */
  const related = alarms.filter((alarm) => alarm.title.includes(equipment.name));

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      eyebrow="설비 이상 탐지"
      title={equipment.name}
      footer={<StatusBadge level={equipment.status} size="sm" />}
    >
      <ModalFacts>
        <ModalFact label="상태 등급" value={PROVISIONAL_STATUS_LABELS[equipment.status]} />
        <ModalFact label="가동" value={RUN_LABEL[runStateOf(equipment.running)]} />
        <ModalFact
          label="이상 신호"
          value={
            equipment.signals.length === 0
              ? '없음'
              : equipment.signals.map((s) => EQUIPMENT_SIGNAL_LABELS[s]).join(' · ')
          }
        />
        <ModalFact
          label="이상 지속"
          value={equipment.anomalyHours === null ? '—' : `${equipment.anomalyHours}시간`}
          mono
        />
        <ModalFact label="누적 운전시간" value={`${equipment.runtimeHours}시간`} mono />
      </ModalFacts>

      {/*
       * 값을 보여 주면서 그 값이 무엇으로 만들어졌는지 말하지 않으면 검증된 지표처럼 읽힌다(E3).
       * 여기서 밝혀야 하는 것은 **무엇을 내리기로 했는지**다 — 없어진 값을 찾는 사람이 있다.
       */}
      <p className="mt-3 max-w-[62ch] border-t border-border pt-3 text-[11px] leading-relaxed text-fg-subtle">
        <strong className="text-fg-muted">고장 확률·잔여 수명(RUL)·MPI는 표시하지 않는다</strong> —
        예지보전으로 그 값을 내기는 어렵다는 판단이다 [회의 2026-08-20]. 현실적으로 가능한 것은
        진동 센서 기반 이상 탐지와 가동 상태 확인이며, 진동 센서의 단위·측정 범위는 아직
        정해지지 않아 [TBD-49] <strong className="text-fg-muted">값이 아니라 이상 여부만</strong>
        낸다. 원문 성과지표(설비 고장 예측 정확도 ≥85% [원문 p.30·31·80])와 어긋나는 사실은
        [INC-107]에 남겼다.
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-1 text-[11px] text-fg-subtle">이상 발생 시각</p>
        <p className="text-[12px] text-fg">
          {equipment.anomalySinceIso === null ? (
            equipment.signals.length === 0 ? (
              '최근 24시간에 이상 신호가 없습니다.'
            ) : (
              /* 신호는 있는데 시각을 모르는 경우다 — 통신이 끊겨 언제부터인지 알 수 없다(E4) */
              '이상 신호가 있으나 통신 두절로 시작 시각을 알 수 없습니다.'
            )
          ) : (
            <>
              <span className="num">{formatDateTime(equipment.anomalySinceIso)}</span>{' '}
              <span className="text-fg-subtle">
                {DISPLAY_TIMEZONE} · {formatRelative(equipment.anomalySinceIso, DEMO_NOW_ISO)}
              </span>
            </>
          )}
        </p>
        <p className="mt-1.5 max-w-[62ch] text-[11px] leading-relaxed text-fg-subtle">
          이상 이력은 저장소가 없어 시연용으로 만든 값이다 [REQ-AD-019 미구현].
        </p>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-[11px] text-fg-subtle">이 설비의 알람 {related.length}건</p>
        {related.length === 0 ? (
          <p className="text-[12px] text-fg-subtle">최근 24시간에 이 설비로 발생한 알람이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {related.map((alarm) => (
              <li key={alarm.id} className="text-[12px]">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-fg">{alarm.title}</span>
                  <span className="text-[11px] text-fg-subtle">
                    {ALARM_PRIORITY_LABELS[alarm.priority]} ·{' '}
                    {formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-subtle">{alarm.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

const RUN_LABEL = { on: '가동', off: '정지', unknown: '모름' } as const;

const runStateOf = (running: boolean | null): keyof typeof RUN_LABEL =>
  running === null ? 'unknown' : running ? 'on' : 'off';
