'use client';

import { useEffect, useState } from 'react';
import { DISPLAY_TIMEZONE, formatKstWallMinute } from '@/shared/lib/format';
import { WALL_CLOCK_TICK_MS } from '../config/constants';

/**
 * 벽시계 — **셸의 `LiveClock`을 쓰지 않는다.**
 *
 * 그쪽은 `widgets/app-shell` 안에 있어 위젯끼리 가져올 수 없고(FSD §8), 초 단위로 흐른다.
 * 이 화면은 종일 켜져 있어 **초침이 눈에 남는다** — 분이 바뀔 때만 갱신한다
 * (`WALL_CLOCK_TICK_MS`).
 *
 * **머리줄의 시각과 값의 기준 시각은 다른 것이다**(§8 `시각 표기`). 이것은 지금 몇 시인가이고,
 * 곁에 적히는 `기준 …`은 계측이 마지막으로 관측된 시각이다. 둘을 한 줄에 쓰되 이름을 따로 단다.
 *
 * 서버에서는 그리지 않는다 — 서버 시각과 브라우저 시각이 달라 hydration이 어긋난다.
 */
export function WallClock({ className }: { className?: string }) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(formatKstWallMinute(new Date()));
    tick();

    const id = window.setInterval(tick, WALL_CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  /* 첫 프레임에는 자리만 잡는다. 빈 칸이 아니라 «아직»이라 글자를 비워 두지 않는다 */
  return (
    <span className={className}>
      <span className="num">{now ?? '--:--'}</span>
      <span className="ml-1.5 font-medium text-fg-subtle">{DISPLAY_TIMEZONE}</span>
    </span>
  );
}
