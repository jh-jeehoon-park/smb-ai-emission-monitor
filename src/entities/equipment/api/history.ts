import { siteSeed } from '@/shared/config/demo-scenario';
import { toStatusLevel } from '@/shared/config/provisional';
import { clamp, createRng, roundTo } from '@/shared/lib/prng';
import { isMissingAt, isTreatmentIdleAt, timelineIsoAt } from '@/shared/lib/timeline';
import {
  RUL_HISTORY_DAYS,
  STATUS_TIMELINE_HOURS,
  SAMPLES_PER_STATUS_CELL,
} from '../config/constants';
import type {
  Equipment,
  EquipmentStatusCell,
  RulPoint,
  RulSeriesPoint,
  TreatmentCell,
} from '../model/types';

const MS_PER_DAY = 86_400_000;

/**
 * 하루에 줄어드는 잔여 수명.
 *
 * 1일보다 조금 크다 — 마모가 진행될수록 남은 수명이 더 빨리 줄어드는 것으로 본다. 고장 확률이
 * 높은 설비일수록 가파르다. 확률과 수명이 따로 놀면 카드와 그래프가 어긋난다.
 *
 * **감소 폭은 시연값이며 원문에 근거가 없다.**
 */
function dailyLossOf(equipment: Equipment): number {
  return 1 + (equipment.failureProbability / 100) * 0.9;
}

/**
 * 잔여 수명이 줄어온 자취.
 *
 * **단조 감소다** — 잔여 수명은 시간이 지나면 줄어드는 것이 정의이고, 늘어나려면 정비가
 * 있어야 하는데 우리에겐 정비 이력이 없다(`REQ-AD-019`). 늘었다 줄었다 하면 화면이
 * 설명할 수 없는 사건을 암시한다.
 */
export function getRulHistory(siteId: string, equipment: Equipment): RulPoint[] {
  const rng = createRng(siteSeed(`${siteId}-${equipment.id}`, 88401));
  const now = new Date(timelineIsoAt(0)).getTime();
  const dailyLoss = dailyLossOf(equipment);

  /*
   * 하루치 감소를 날마다 흔들어 쌓는다. 고정값으로 곱하면 자로 그은 직선이 나와 관측이 아니라
   * 수식으로 읽힌다 — 실제 마모는 부하에 따라 날마다 다르다.
   *
   * 흔들림을 **감소 폭에** 주고 값에 직접 더하지 않는 것이 요점이다. 배수가 늘 양수라
   * 단조 감소가 산술로 보장된다. 값에 잡음을 더하면 하루 오르내려 정비를 암시한다.
   */
  let cumulative = 0;
  const losses = Array.from({ length: RUL_HISTORY_DAYS }, () => {
    cumulative += dailyLoss * (0.55 + rng() * 0.9);
    return cumulative;
  });

  return Array.from({ length: RUL_HISTORY_DAYS + 1 }, (_, i) => {
    const dayOffset = RUL_HISTORY_DAYS - i;
    /* 오늘은 카드에 적힌 값 그대로다. 여기서 어긋나면 같은 화면이 두 숫자를 말한다 */
    const back = dayOffset === 0 ? 0 : losses[dayOffset - 1]!;
    return {
      dayOffset,
      iso: new Date(now - dayOffset * MS_PER_DAY).toISOString().slice(0, 10),
      rul: roundTo(equipment.remainingUsefulLifeDays + back, 0),
    };
  });
}

/**
 * 잔여 수명이 0에 닿는 **예상 시점**(일 후).
 *
 * 현재 값과 감소 추세만으로 낸 단순 외삽이다. **예지보전 모델의 산출이 아니다** —
 * 원문의 RandomForest는 고장 확률을 내고(`[원문 p.66]`) 언제 0이 되는지는 주지 않는다.
 * 화면이 그 차이를 적는다.
 */
export function daysUntilDepleted(equipment: Equipment): number {
  return Math.max(1, Math.round(equipment.remainingUsefulLifeDays / dailyLossOf(equipment)));
}

/**
 * 지나온 추이 + 0에 닿기까지의 외삽을 한 계열로 잇는다.
 *
 * 두 구간을 **다른 키로** 낸다 — 화면이 실선/파선을 나눠 그려야 하기 때문이다. 지나온 값과
 * 앞날의 추정이 같은 선으로 이어지면 뒤쪽 절반이 관측된 사실처럼 읽힌다(E3).
 */
export function getRulSeries(siteId: string, equipment: Equipment): RulSeriesPoint[] {
  const history = getRulHistory(siteId, equipment);
  const today = history[history.length - 1]!;
  const dailyLoss = dailyLossOf(equipment);
  const ahead = daysUntilDepleted(equipment);

  const past: RulSeriesPoint[] = history.map((point) => ({
    day: -point.dayOffset,
    iso: point.iso,
    actual: point.rul,
    /* 오늘 칸에만 두 값을 겹쳐 둔다. 없으면 파선이 하루 떨어진 곳에서 따로 시작한다 */
    projected: point.dayOffset === 0 ? point.rul : null,
  }));

  const now = new Date(today.iso).getTime();
  const future: RulSeriesPoint[] = Array.from({ length: ahead }, (_, i) => {
    const day = i + 1;
    return {
      day,
      iso: new Date(now + day * MS_PER_DAY).toISOString().slice(0, 10),
      actual: null,
      projected: Math.max(0, Math.round(equipment.remainingUsefulLifeDays - day * dailyLoss)),
    };
  });

  return [...past, ...future];
}

/**
 * 24시간 × 설비의 상태 격자.
 *
 * 한 칸은 한 시간이다. 원문 예시가 `00시~24시`를 시간 단위로 끊는다 `[원문 발표 p.18 그림]`.
 * 5분 표본을 그대로 쓰면 288칸이 되어 색을 구분할 수 없다.
 *
 * **한 시간 안에 결측이 하나라도 있으면 그 칸은 모름이다.** 나머지 표본으로 채워 넣으면
 * 끊긴 시간이 화면에서 사라진다(E4).
 */
export function getStatusTimeline(siteId: string, equipment: Equipment): EquipmentStatusCell[] {
  const rng = createRng(siteSeed(`${siteId}-${equipment.id}`, 88402));

  return Array.from({ length: STATUS_TIMELINE_HOURS }, (_, hour) => {
    const from = hour * SAMPLES_PER_STATUS_CELL;
    const samples = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) => from + k);

    const missing = samples.some((index) => isMissingAt(siteId, index));
    const iso = timelineIsoAt(from);
    if (missing) return { hourOffset: hour, iso, level: null };

    /*
     * 시간이 갈수록 나빠지는 흐름을 준다 — 마지막 구간에 이상 상황이 심어져 있어(EVENT_START)
     * 설비만 하루 종일 평평하면 화면이 따로 논다.
     */
    const progress = hour / (STATUS_TIMELINE_HOURS - 1);
    const last = hour === STATUS_TIMELINE_HOURS - 1;

    /*
     * **마지막 칸은 현재 고장 확률 그대로다.** 그 칸이 곧 지금이라 카드·표와 같은 등급이어야
     * 한다. 흔들림을 얹으면 격자는 `위험`, 카드는 `경고`가 되어 한 화면이 현재를 두 가지로 말한다.
     */
    const score = last
      ? equipment.failureProbability
      : equipment.failureProbability * (0.55 + progress * 0.45) + (rng() - 0.5) * 10;

    return {
      hourOffset: hour,
      iso,
      level: toStatusLevel(clamp(Math.round(score), 0, 100)),
    };
  });
}

/**
 * 같은 격자의 **방지시설 가동 여부** 줄.
 *
 * 설비 칸에 함께 담지 않는다. 방지시설 가동은 **사업장 단위 사실**이고, 설비 칸에 붙이면
 * "이 방류 펌프도 멈춰 있었다"를 주장하게 된다 — 방지시설은 멈췄는데 방류 펌프는 돌았다는
 * 것이 바로 무단방류 의심의 요지다(`TBD-46`). 두 축을 겹치면 그 구분이 사라진다.
 *
 * 판정 자체는 `isTreatmentIdleAt`이 이미 한다. 여기서는 시간 단위로 묶기만 한다.
 */
export function getTreatmentTimeline(siteId: string): TreatmentCell[] {
  return Array.from({ length: STATUS_TIMELINE_HOURS }, (_, hour) => {
    const from = hour * SAMPLES_PER_STATUS_CELL;
    const samples = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) =>
      isTreatmentIdleAt(siteId, from + k),
    );

    /* 한 표본이라도 모르면 그 시간은 모름이다 — 아는 것만 모아 단정하면 공백이 사라진다(E4) */
    const idle = samples.some((v) => v === null) ? null : samples.some((v) => v === true);

    return { hourOffset: hour, iso: timelineIsoAt(from), idle };
  });
}

