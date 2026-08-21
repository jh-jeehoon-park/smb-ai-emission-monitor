"use client";

import { OPERATING_FILL } from "@/shared/config/operating-visual";
import { RiseItem, StaggerGroup } from "@/shared/ui/motion";
import { StatusBadge } from "@/shared/ui/status-badge";
import { EQUIPMENT_SIGNAL_LABELS, type Equipment } from "@/entities/equipment";

export function EquipmentPanel({
  items,
  online,
  onSelect,
}: {
  items: Equipment[];
  online: boolean;
  /** 상세를 여는 화면에서만 넘긴다. 없으면 카드가 눌리지 않는다 */
  onSelect?: (equipment: Equipment) => void;
}) {
  /* ECP가 끊기면 설비 텔레메트리도 오지 않는다. 계측·이상 점수는 결측인데 설비만
     멀쩡한 숫자를 띄우면 한 화면이 서로 다른 말을 한다(E3·R19). */
  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
        <p className="num text-[26px] leading-none text-fg-subtle">—</p>
        <p className="text-[12px] text-fg-muted">설비 수신값 없음</p>
        <p className="max-w-[46ch] text-[11px] leading-relaxed text-fg-subtle">
          ECP 통신이 두절되어 설비 상태를 수신하지 못했습니다. 복구 시 로컬
          버퍼가 일괄 전송됩니다.
        </p>
      </div>
    );
  }

  /*
   * 네 칸일 때는 **열 간격을 0으로 두고 여백을 칸 안쪽에 준다.**
   * `divide-x`가 칸의 오른쪽에 선을 그으므로 간격이 남아 있으면 선이 왼쪽 카드에는 붙고
   * 오른쪽 카드에서는 `간격 + 여백`만큼 떨어져 좌우가 어긋난다.
   */
  return (
    <StaggerGroup className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-0 xl:divide-x xl:divide-border">
      {items.map((eq) => {
        const state = eq.running === null ? "unknown" : eq.running ? "on" : "off";
        return (
          /*
           * 카드 안에 카드를 넣지 않는다 — 구분선과 여백으로 위계를 만든다.
           *
           * 여백을 **격자의 직접 자식**에 준다. 예전에는 안쪽 `div`에 `px-4 first:pl-0 last:pr-0`을
           * 걸었는데, 그 `div`는 자기 부모의 첫 자식이자 마지막 자식이라 **양쪽이 다 0**이 되어
           * 여백이 통째로 사라졌다 — 내용이 구분선에 그대로 맞닿았다.
           */
          <RiseItem key={eq.id} className="xl:px-4 xl:first:pl-0 xl:last:pr-0">
            <div className="flex items-center justify-between gap-2">
              {/* 이름만 누르게 둔다 — 카드 전체를 버튼으로 만들면 진행 막대까지 눌리는 영역이 된다 */}
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(eq)}
                  className="min-w-0 cursor-pointer truncate text-left text-[12px] font-medium text-fg underline decoration-transparent underline-offset-2 transition-colors duration-200 hover:decoration-border-strong"
                >
                  {eq.name}
                </button>
              ) : (
                <p className="truncate text-[12px] font-medium text-fg">
                  {eq.name}
                </p>
              )}
              <StatusBadge level={eq.status} size="sm" />
            </div>

            {/*
             * 고장 확률·잔여 수명·MPI가 있던 자리다. 회의가 예지보전을 내리게 해
             * `[INC-107]` **값이 아니라 상태**를 보인다 — 가동 여부와 걸린 신호.
             *
             * 진행 막대도 없앴다. 채울 값(고장 확률 %)이 사라졌고, 이상 여부는 0~100이
             * 아니라 있음/없음이라 막대로 표현할 축이 아니다.
             */}
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <Metric label="가동" value={RUN_LABEL[state]} dot={OPERATING_FILL[state]} />
              <Metric
                label="이상 신호"
                value={
                  eq.signals.length === 0
                    ? "없음"
                    : eq.signals.map((s) => EQUIPMENT_SIGNAL_LABELS[s]).join(" · ")
                }
              />
            </div>

            {/* 지속은 이상이 있을 때만 뜻이 있다. 없을 때 `—`를 두면 빈 칸이 하나 더 늘어난다 */}
            {eq.anomalyHours !== null && (
              <p className="mt-1.5 text-[11px] text-fg-subtle">
                <span className="num">{eq.anomalyHours}시간</span> 이어짐
              </p>
            )}
          </RiseItem>
        );
      })}
    </StaggerGroup>
  );
}

const RUN_LABEL = { on: "가동", off: "정지", unknown: "모름" } as const;

/**
 * 지표 한 칸.
 *
 * `dot`은 가동 상태처럼 **색이 뜻을 갖는** 값에만 준다. 등급 색이 아니라 `OPERATING_FILL`을
 * 쓴다 — 켜짐/꺼짐은 등급이 아니고, 초록으로 칠한 `가동`은 `정상 등급`으로 읽힌다
 * (`design-system §2`).
 */
function Metric({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div>
      <p className="text-fg-subtle">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-fg">
        {dot && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
        )}
        {value}
      </p>
    </div>
  );
}
