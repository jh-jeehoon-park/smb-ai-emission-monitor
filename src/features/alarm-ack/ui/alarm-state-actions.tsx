'use client';

import { cn } from '@/shared/lib/cn';
import type { Alarm, AlarmState } from '@/entities/alarm';

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
      className={cn(
        'cursor-pointer whitespace-nowrap rounded-[3px] border px-2 py-1 text-[11px]',
        'border-border text-fg-muted transition-colors duration-200',
        'hover:border-border-strong hover:bg-surface-2 hover:text-fg',
      )}
    >
      {actionLabel}
    </button>
  );
}
