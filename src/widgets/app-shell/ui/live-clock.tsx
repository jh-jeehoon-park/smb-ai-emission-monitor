'use client';

import { useSyncExternalStore } from 'react';
import { DISPLAY_TIMEZONE, formatKstDateTime } from '@/shared/lib/format';

const TICK_MS = 1000;

function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, TICK_MS);
  return () => clearInterval(id);
}

/** 초 단위로만 바뀌는 값이라 렌더가 초당 한 번을 넘지 않는다 */
const getSnapshot = () => Math.floor(Date.now() / 1000);

/** **서버에는 시계가 없다.** 고정값을 주어 서버와 하이드레이션 첫 렌더가 같아지게 한다 */
const getServerSnapshot = () => 0;

/**
 * 현재 시각을 초 단위로 흘린다.
 *
 * 렌더 중에 `new Date()`를 읽으면 서버가 그린 문자열과 클라이언트가 그릴 문자열이 달라
 * hydration이 깨진다. 시간은 React 밖의 외부 소스이므로 `useSyncExternalStore`로 구독한다 —
 * effect에서 setState를 부르는 방식보다 이쪽이 이 용도에 맞고 렌더도 한 번 덜 돈다.
 *
 * **이 시계는 현재 시각이지 데이터의 시각이 아니다.** 시연 데이터는 고정 시점을 기준으로
 * 만들어져 있어 차트 축의 날짜와 다르다. 그래서 라벨을 '현재'로 붙인다.
 */
export function LiveClock() {
  const tick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-fg-subtle">현재</span>
      {/* 폭을 미리 잡아 값이 들어올 때 옆 요소가 밀리지 않게 한다 */}
      <span className="num inline-block min-w-[10.5rem] text-fg-muted">
        {tick === 0 ? ' ' : `${formatKstDateTime(new Date())} ${DISPLAY_TIMEZONE}`}
      </span>
    </span>
  );
}
