import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { formatClock } from '@/shared/lib/format';
import { TIMELINE_POINT_COUNT, timelineIsoAt } from '@/shared/lib/timeline';

export interface RibbonTick {
  index: number;
  /** 트랙 폭 대비 0~100. 막대와 같은 288칸 좌표를 쓴다 */
  percent: number;
  /** `14:25` 같은 KST 벽시계. 창의 끝은 `지금` */
  label: string;
  /** 날짜가 넘어가는 지점 — 선을 진하게 긋고 날짜를 적는다 */
  isDayBreak: boolean;
  /** `08-11` — 자정 눈금에만 있다 */
  dateLabel: string | null;
}

const SAMPLES_PER_HOUR = 60 / COLLECTION_INTERVAL_MINUTES;

/**
 * 시간 눈금.
 *
 * **경과 시간이 아니라 실제 시각을 적는다.** 예전에는 `00 06 12 18 24`를 적었는데,
 * 시계 시각처럼 보이지만 창의 시작(`08-10 14:25`)부터 센 경과 시간이라 알람 시각과
 * 맞춰 볼 수 없었다. 리본을 보는 이유가 "그때 무슨 일이 있었나"인데 그 '그때'를
 * 읽을 수 없으면 그림이 소용없다(**E5**).
 *
 * **자정은 간격에 맞춰 오지 않는다.** 6시간 눈금에 걸리기를 기다리면 표시가 영영
 * 안 나온다 — 자정이 있는 표본을 따로 찾아 눈금으로 넣는다. 하루가 넘어가는 지점을
 * 모르면 `02:00`이 어제인지 오늘인지 알 수 없다.
 */
export function buildTicks(everyHours: number): RibbonTick[] {
  const step = everyHours * SAMPLES_PER_HOUR;
  const indexes = new Set<number>();

  for (let index = 0; index < TIMELINE_POINT_COUNT; index += step) indexes.add(index);

  const midnight = findDayBreak();
  if (midnight !== null) indexes.add(midnight);

  indexes.add(TIMELINE_POINT_COUNT - 1);

  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => tickAt(index, index === midnight));
}

function tickAt(index: number, isDayBreak: boolean): RibbonTick {
  const iso = timelineIsoAt(index);
  const isEnd = index === TIMELINE_POINT_COUNT - 1;

  return {
    index,
    /* 막대는 뷰박스 288칸에 그려진다. 눈금도 같은 칸 경계에 서야 어긋나지 않는다 */
    percent: isEnd ? 100 : (index / TIMELINE_POINT_COUNT) * 100,
    label: isEnd ? '지금' : formatClock(iso),
    isDayBreak,
    dateLabel: isDayBreak ? iso.slice(5, 10) : null,
  };
}

/** 앞 표본과 날짜가 달라지는 첫 표본. 창 안에 자정이 없으면 null */
function findDayBreak(): number | null {
  for (let index = 1; index < TIMELINE_POINT_COUNT; index += 1) {
    if (timelineIsoAt(index).slice(0, 10) !== timelineIsoAt(index - 1).slice(0, 10)) return index;
  }
  return null;
}
