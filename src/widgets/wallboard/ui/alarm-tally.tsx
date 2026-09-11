'use client';

import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  type Alarm,
  type AlarmPriority,
} from '@/entities/alarm';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { WALL_LABEL, WALL_META, WALL_VALUE_MD, WALL_VALUE_XL } from '../config/constants';
import { useCountUp } from '../lib/use-count-up';
import { useValueFlash } from '../lib/use-value-flash';

/**
 * 우선순위를 등급 색에 맞춘다 — **새 색을 만들지 않는다.**
 *
 * 알람 우선순위(긴급·주의·정보) 3단과 상태 등급 4단이 **같은 축인지 원문이 말하지 않는다**
 * (`[INC-02]`). 그래서 색만 빌리고 **라벨은 우선순위의 것을 그대로 쓴다** — 둘을 같은 것으로
 * 적으면 원문이 정하지 않은 대응을 화면이 주장하게 된다.
 */
const PRIORITY_TONE: Record<AlarmPriority, keyof typeof STATUS_VISUAL> = {
  urgent: 'critical',
  caution: 'warning',
  info: 'normal',
};

const PRIORITIES: AlarmPriority[] = ['urgent', 'caution', 'info'];

/**
 * 미확인 알람 — **큰 수 하나와 우선순위 세 줄.**
 *
 * `[사용자 요청 2026-09-11: 최대한 레퍼런스와 유사한 UI]`. 레퍼런스가 «전체 630 / 고위험 70 /
 * 위험 175 / 일반 385»를 한 덩어리로 놓는 짜임을 그대로 따른다 — 합이 왼쪽에 크게, 갈래가
 * 오른쪽에 줄로 선다.
 *
 * **괄호 안의 증감은 두지 않는다.** 레퍼런스는 `70 (3)`처럼 전일 대비를 함께 적는데, 우리는
 * 그 값을 갖고 있지 않다 — 만들려면 어제 알람을 세는 집계를 새로 만들어야 하고 그것은 이번
 * 작업이 하지 않기로 한 «새 데이터»다 `[사용자 확인 2026-09-10]`.
 */
export function AlarmTally({
  open,
  byPriority,
  recent,
}: {
  open: number;
  byPriority: Record<AlarmPriority, number>;
  /** 맨 위 몇 건. 이 화면은 목록을 다 싣지 않는다 — 정본은 `/alarms`다 */
  recent: readonly Alarm[];
}) {
  const flashing = useValueFlash(open);
  const shown = useCountUp(open, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div
      className={cn(
        'flex shrink-0 items-center gap-5 rounded-nested border border-border bg-surface-2 p-4 transition-colors duration-500',
        flashing && 'bg-accent-weak',
      )}
    >
      <div className="shrink-0">
        <p className={cn('text-fg-subtle', WALL_META)}>미확인</p>
        <p className="mt-1.5 flex items-baseline gap-1.5">
          <span className={cn('num text-fg', WALL_VALUE_XL)}>{shown}</span>
          <span className="text-[16px] font-medium text-fg-muted">건</span>
        </p>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {PRIORITIES.map((priority) => {
          const visual = STATUS_VISUAL[PRIORITY_TONE[priority]];
          return (
            <li
              key={priority}
              className="flex items-center justify-between gap-3 rounded-chip bg-surface px-3 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2">
                {/* 색 옆에 늘 이름이 있다 — 색만으로 등급을 전달하지 않는다(E2) */}
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: visual.hex }}
                />
                <span className={cn('truncate', WALL_LABEL)}>
                  {ALARM_PRIORITY_LABELS[priority]}
                </span>
              </span>
              <span className={cn('num shrink-0', WALL_VALUE_MD)} style={{ color: statusInk(visual) }}>
                {byPriority[priority]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>

      {/*
       * 맨 위 몇 건 — 레퍼런스의 «알람 및 공지» 자리다.
       *
       * **흐르지 않는다.** 레퍼런스는 티커로 문구를 옮기는데 그것은 새 무한 반복이라
       * §8 `모션`이 막는다. 벽에서는 맨 위 몇 건이 고정으로 보이는 편이 오히려 읽힌다.
       *
       * **목록을 다 싣지 않는다** — 정본은 `/alarms`이고 여기는 «지금 무엇이 밀려 있나»까지다.
       */}
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {recent.map((alarm) => {
          const visual = STATUS_VISUAL[PRIORITY_TONE[alarm.priority]];
          return (
            <li
              key={alarm.id}
              className="min-w-0 rounded-nested border border-border bg-surface-2 px-3.5 py-2.5"
            >
              <p className="flex min-w-0 items-baseline gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 translate-y-[-2px] rounded-full"
                  style={{ backgroundColor: visual.hex }}
                />
                <span className={cn('min-w-0 flex-1 truncate', WALL_LABEL)}>{alarm.title}</span>
              </p>
              <p className={cn('mt-1 truncate text-fg-subtle', WALL_META)}>
                {ALARM_CONDITION_LABELS[alarm.condition]}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
