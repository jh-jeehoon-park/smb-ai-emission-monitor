'use client';

import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { formatRelative } from '@/shared/lib/format';
import { Modal, ModalFact, ModalFacts } from '@/shared/ui/modal';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ALARM_PRIORITY_LABELS, type Alarm } from '@/entities/alarm';
import { daysUntilDepleted, type Equipment } from '@/entities/equipment';
import { RulChart } from './rul-chart';

interface EquipmentDetailModalProps {
  siteId: string;
  equipment: Equipment | null;
  alarms: Alarm[];
  onClose: () => void;
}

/**
 * 설비 상세.
 *
 * 카드에 이미 세 지표가 있으므로, 모달이 더하는 것은 **그 값을 어떻게 읽어야 하는지**다 —
 * 운전시간·상태 등급·그 설비에 걸린 알람, 그리고 **MPI에 산정식이 없다는 사실**.
 *
 * 원문에 없는 것을 채우지 않는다 — 유지관리 이력·교체 주기·조치 절차는 저장소도 원천도 없다
 * (REQ-AD-019·021 `[TBD]`).
 */
export function EquipmentDetailModal({
  siteId,
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
      eyebrow="RandomForest · 예지보전"
      title={equipment.name}
      footer={<StatusBadge level={equipment.status} size="sm" />}
    >
      <ModalFacts>
        <ModalFact label="상태 등급" value={PROVISIONAL_STATUS_LABELS[equipment.status]} />
        <ModalFact label="고장 확률" value={`${equipment.failureProbability}%`} mono />
        <ModalFact label="잔여 수명" value={`${equipment.remainingUsefulLifeDays}일`} mono />
        <ModalFact
          label="유지관리 우선순위"
          value={`${equipment.maintenancePriorityIndex} (0~100 상대 지수)`}
          mono
        />
        <ModalFact label="누적 운전시간" value={`${equipment.runtimeHours}시간`} mono />
      </ModalFacts>

      {/*
       * 값을 보여 주면서 그 값이 무엇으로 만들어졌는지 말하지 않으면 검증된 지표처럼 읽힌다(E3).
       * MPI는 산정식·범위·단위가 모두 원문에 없다.
       */}
      <p className="mt-3 max-w-[60ch] border-t border-border pt-3 text-[11px] leading-relaxed text-fg-subtle">
        고장 확률·잔여 수명은 RandomForest 산출값이다 [원문 p.66]. <strong className="text-fg-muted">
        유지관리 우선순위(MPI)는 산정식이 원문에 없어</strong> 순서를 매기는 상대 지수로만 쓴다
        [TBD-22]. 예지보전 입력은 전류·전력·운전시간이다 [원문 p.30·31].
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-[11px] text-fg-subtle">잔여 수명 추이</p>
          <p className="text-[11px] text-fg-subtle">
            0 도달 예상 <span className="num text-fg-muted">{daysUntilDepleted(equipment)}일 후</span>
          </p>
        </div>
        <RulChart siteId={siteId} equipment={equipment} />
        {/*
          곡선의 뒤쪽 절반은 관측이 아니다. 그 사실을 그림 옆에 적지 않으면 파선도 산출값처럼
          읽힌다(E3). RandomForest는 고장 확률을 내고 0에 닿는 날짜는 주지 않는다.
        */}
        <p className="mt-1.5 max-w-[60ch] text-[11px] leading-relaxed text-fg-subtle">
          파선은 현재 감소 추세를 그대로 늘린 <strong className="text-fg-muted">단순 외삽</strong>이며
          예지보전 모델의 산출이 아니다. 잔여 수명 이력은 저장소가 없어 시연용으로 만든 값이다
          [REQ-AD-019 미구현].
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
