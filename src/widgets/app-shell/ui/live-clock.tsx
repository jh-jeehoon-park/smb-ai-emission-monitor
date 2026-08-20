'use client';

import { useSyncExternalStore } from 'react';
import { formatKstWallClock } from '@/shared/lib/format';

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
 * 현재 시각.
 *
 * 렌더 중에 `new Date()`를 읽으면 서버가 그린 문자열과 클라이언트가 그릴 문자열이 달라
 * hydration이 깨진다. 시간은 React 밖의 외부 소스이므로 `useSyncExternalStore`로 구독한다 —
 * effect에서 setState를 부르는 방식보다 이쪽이 이 용도에 맞고 렌더도 한 번 덜 돈다.
 *
 * **이 시계는 현재 시각이지 데이터의 시각이 아니다.** 시연 데이터는 고정 시점을 기준으로
 * 만들어져 있어 차트 축의 날짜와 다르다 — 바로 아래 줄의 `데이터 기준 …`이 그 차이를 적는다.
 *
 * 표기에 시간대를 적지 않는다 `[사용자 요청 2026-08-20]`. 기준 시간대는 바로 아래 줄의
 * `데이터 기준 … KST`가 계속 밝히므로 화면에서 사라지지는 않는다(E5).
 *
 * 초까지 적으므로 **1초마다 리렌더된다.** 바뀌는 것은 이 `span`의 문자열 하나뿐이다.
 */
export function LiveClock() {
  const second = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <span className="flex items-center gap-1.5">
      {/*
       * 폭을 미리 잡아 값이 들어올 때 옆 요소가 밀리지 않게 한다.
       * 가장 긴 표기(`12월 30일 (수) 오후 12:00:00`)를 실측한 140px에 맞춘 값이다 — 넉넉히 잡으면 값
       * 오른쪽에 빈 자리가 남아 알림 아이콘과의 간격이 어긋난다.
       */}
      <span className="num inline-block min-w-[8.75rem] text-fg-muted">
        {second === 0 ? ' ' : formatKstWallClock(new Date())}
      </span>
    </span>
  );
}
