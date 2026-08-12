'use client';

import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { RiseItem, StaggerGroup, motion } from '@/shared/ui/motion';
import { StatusBadge } from '@/shared/ui/status-badge';
import type { Equipment } from '@/entities/equipment';

export function EquipmentPanel({ items, online }: { items: Equipment[]; online: boolean }) {
  /* ECP가 끊기면 설비 텔레메트리도 오지 않는다. 계측·이상 점수는 결측인데 설비만
     멀쩡한 숫자를 띄우면 한 화면이 서로 다른 말을 한다(E3·R19). */
  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
        <p className="num text-[26px] leading-none text-fg-subtle">—</p>
        <p className="text-[12px] text-fg-muted">설비 수신값 없음</p>
        <p className="max-w-[46ch] text-[11px] leading-relaxed text-fg-subtle">
          ECP 통신이 두절되어 예지보전 지표가 산출되지 않았습니다. 복구 시 로컬 버퍼가 일괄
          전송됩니다.
        </p>
      </div>
    );
  }

  return (
    <StaggerGroup className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-border">
      {items.map((eq, i) => {
        const visual = STATUS_VISUAL[eq.status];
        return (
          <RiseItem key={eq.id}>
            {/* 카드 안에 카드를 넣지 않는다 — 구분선과 여백으로 위계를 만든다 */}
            <div className="xl:px-4 xl:first:pl-0 xl:last:pr-0">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-medium text-fg">{eq.name}</p>
                <StatusBadge level={eq.status} size="sm" />
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <Metric label="고장 확률" value={`${eq.failureProbability}%`} />
                <Metric label="잔여 수명" value={`${eq.remainingUsefulLifeDays}일`} />
                {/* MPI 산정식은 원문에 없다(TBD-22). 값만 상대 지수로 보여준다. */}
                <Metric label="MPI" value={String(eq.maintenancePriorityIndex)} />
              </div>

              <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: visual.hex, opacity: 0.8 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${eq.failureProbability}%` }}
                  transition={{ duration: 0.55, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </RiseItem>
        );
      })}
    </StaggerGroup>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-fg-subtle">{label}</p>
      <p className="num mt-0.5 text-[13px] text-fg">{value}</p>
    </div>
  );
}
