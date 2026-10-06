import { formatClock } from '@/shared/lib/format';

/**
 * 세로축의 **맨 위 눈금값** — 데이터 최댓값을 «읽히는 수»로 올린다.
 *
 * 최댓값을 그대로 천장으로 쓰면 눈금이 `938`·`1003`처럼 떠서, 2~3m 밖에서 **읽는 데 시간이
 * 걸리는 수**가 된다. 1·2·5 계열로 올리면 천장과 그 절반이 둘 다 깔끔하다
 * (1000/500 · 500/250 · 200/100).
 *
 * **2.5를 쓰지 않는다** — 절반이 `1.25`가 되어 가운데 눈금이 더러워진다.
 */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export interface TrendTick {
  /** 계열에서의 자리. 가로 위치는 `index / (length - 1)`이다 */
  index: number;
  /** `HH:MM` */
  label: string;
}

/**
 * 가로축 눈금 — **정시에 맞추고, 맨 끝은 언제나 «지금»이다.**
 *
 * 계열을 n등분해 라벨을 달면 `13:28 · 17:28 · 21:28`처럼 어중간한 시각이 늘어선다. 벽에서
 * 읽는 사람이 묻는 것은 «몇 시쯤부터 올랐나»라 **정시가 훨씬 빨리 읽히고**, 자정(`00:00`)이
 * 눈금으로 서면 어제와 오늘의 경계가 그림에 드러난다.
 *
 * **마지막 표본을 반드시 넣는다.** 정시 눈금만 두면 오른쪽 끝이 언제인지 알 수 없어 «최근
 * 24시간»이라는 말과 그림이 이어지지 않는다(**E5**).
 *
 * 끝 눈금과 너무 가까운 정시 눈금은 뺀다 — 글자가 겹친다.
 */
export function trendTicks(
  times: string[],
  stepHours: number,
  minGapRatio: number,
): TrendTick[] {
  if (times.length < 2) return [];

  const last = times.length - 1;
  const minGap = Math.round(times.length * minGapRatio);

  const ticks: TrendTick[] = [];
  times.forEach((iso, index) => {
    if (index > last - minGap) return;
    const at = new Date(iso);
    if (at.getUTCMinutes() !== 0) return;
    if (at.getUTCHours() % stepHours !== 0) return;
    ticks.push({ index, label: formatClock(iso) });
  });

  ticks.push({ index: last, label: formatClock(times[last]!) });
  return ticks;
}
