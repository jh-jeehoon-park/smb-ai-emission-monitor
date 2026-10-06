'use client';

import type { Alarm, AlarmState } from '@/entities/alarm';
import { ACTION_BUTTON } from '@/shared/ui/action-button';

/** 상태는 미확인 → 확인 → 조치 완료로만 흐른다. 되돌리는 동선은 두지 않는다 */
const NEXT_STATE: Record<AlarmState, AlarmState | null> = {
  open: 'acknowledged',
  acknowledged: 'resolved',
  resolved: null,
};

export function AlarmStateActions({
  alarm,
  onChange,
}: {
  alarm: Alarm;
  onChange: (id: string, next: AlarmState) => void;
}) {
  const next = NEXT_STATE[alarm.state];

  // 상태 칩이 이미 '조치 완료'라고 적고 있다. 같은 말을 옆에 또 두지 않는다.
  if (!next) return null;

  /* 같은 화면의 상태 필터가 '미확인·확인·조치 완료'라 버튼까지 같은 명사를 쓰면
     무엇을 거르는 것이고 무엇을 실행하는 것인지 구분되지 않는다. 버튼은 동사로 적는다. */
  const actionLabel = next === 'acknowledged' ? '확인 처리' : '조치 완료 처리';

  return (
    <button
      type="button"
      onClick={() => onChange(alarm.id, next)}
      aria-label={`${alarm.title} ${actionLabel}`}
      /* 이 줄에서 하려던 일이다 — 곁들이는 조작(내보내기 등)과 색으로 갈린다 */
      className={ACTION_BUTTON}
    >
      {actionLabel}
    </button>
  );
}
