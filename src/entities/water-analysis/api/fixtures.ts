import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { createRng, roundTo } from '@/shared/lib/prng';
import {
  ANALYSIS_BASE,
  ANALYSIS_ITEMS,
  ANALYZER_SITE_ID,
  FIRST_SAMPLE_HOUR,
  LAB_ROUND_COUNT,
  SAMPLES_PER_ROUND,
  SAMPLE_MINUTE,
} from '../config/constants';
import { measuredMean } from '../lib/compare';
import type { AnalysisItemCode, AnalysisRound, AnalysisSample } from '../model/types';

/** AI가 추정하는 항목. SS·COD는 대상이 아니다 `[공정자료 p.5·19·12·16]` */
const AI_ESTIMATED_CODES: readonly AnalysisItemCode[] = ['TOC', 'TN', 'TP'];

/** 추정 오차 폭(기저 대비). 시연값이며 성능 목표가 아니다 */
const ESTIMATION_ERROR_RATIO = 0.08;

const DAYS_BETWEEN_ROUNDS = 15;
const MS_PER_DAY = 86_400_000;

/**
 * 성적서에서 가져온 것은 **형식**이다 — 항목 5종, 9:45부터 매시 8건, 발급번호·접수번호 체계
 * `[데이터셋 Non_TMS_sites/05]`. **값의 크기는 시연 계열에 맞춘다.**
 *
 * 실증 성적서의 값(TOC 6.1 · TN 7.44 · TP 0.435)을 그대로 쓰면 우리 AI 추정 계열
 * (TOC 25~39 · TN 16~22 · TP 1.5~1.9)과 자릿수가 달라 오차가 500%로 나온다. 검증 화면이
 * 보여야 하는 것은 **대조 방법**이지 두 시연 값의 우연한 차이가 아니다.
 */
function buildSample(
  rng: () => number,
  timeIso: string,
  receiptNo: string,
  drift: number,
): AnalysisSample {
  const values: Partial<Record<AnalysisItemCode, number>> = {};

  for (const code of Object.keys(ANALYSIS_ITEMS) as AnalysisItemCode[]) {
    const base = ANALYSIS_BASE[code];
    /* 실험실 분석은 시료마다 조금씩 흔들린다. 성적서의 시료 간 편차가 3% 안팎이었다 */
    const noise = (rng() - 0.5) * base * 0.06;
    values[code] = roundTo(base * (1 + drift) + noise, ANALYSIS_ITEMS[code].decimals);
  }

  return { timeIso, receiptNo, values };
}

function buildRound(siteId: string, index: number): AnalysisRound {
  const rng = createRng(siteSeed(siteId, 55001 + index));
  const day = new Date(new Date(DEMO_NOW_ISO).getTime() - index * DAYS_BETWEEN_ROUNDS * MS_PER_DAY);
  const dateLabel = day.toISOString().slice(0, 10);

  /* 회차마다 기저가 조금씩 다르다 — 같은 값이 열두 번 나오면 대조표가 의미를 잃는다 */
  const drift = (rng() - 0.5) * 0.12;
  const serial = String(LAB_ROUND_COUNT - index).padStart(3, '0');

  const samples = Array.from({ length: SAMPLES_PER_ROUND }, (_, i) => {
    const time = new Date(day);
    time.setUTCHours(FIRST_SAMPLE_HOUR + i, SAMPLE_MINUTE, 0, 0);
    return buildSample(
      rng,
      time.toISOString().slice(0, 19) + 'Z',
      `${dateLabel.replace(/-/g, '')}-${String(i + 4).padStart(3, '0')}`,
      drift,
    );
  });

  return {
    id: `WA-${siteId}-${serial}`,
    siteId,
    source: 'lab',
    issueNo: `${dateLabel.replace(/-/g, '')}-${serial}`,
    receivedIso: `${dateLabel}T00:00:00Z`,
    testPeriodLabel: `${dateLabel} ~ ${dateLabel}`,
    lab: '위탁 수분석센터',
    samples,
  };
}

/**
 * 회차 목록 — 최신순.
 *
 * 통신 두절은 **수분석에 영향을 주지 않는다.** 사람이 시료를 떠다 분석하는 방식이라
 * ECP가 끊겨도 결과는 나온다 `[공정자료 p.13]`. 끊긴 것은 **AI 추정 쪽**이고, 그 사실은
 * 대조표에서 AI 열이 비는 것으로 드러난다.
 */
export function getAnalysisRounds(siteId: string): AnalysisRound[] {
  return Array.from({ length: LAB_ROUND_COUNT }, (_, i) => buildRound(siteId, i));
}

/** 이 사업장에 TN/TP 분석기가 설치돼 있는가 `[원문 발표 p.17]` — 1개소뿐이다 */
export function hasAnalyzer(siteId: string): boolean {
  return siteId === ANALYZER_SITE_ID;
}

/** 통신이 살아 있어야 AI 추정이 나온다. 대조표의 AI 열이 비는 이유를 화면이 적는다 */
export function hasEstimation(siteId: string): boolean {
  return getScenario(siteId).online;
}

/**
 * 그 회차 시각의 **AI 추정값**.
 *
 * 실제 시스템은 운영 이력 저장소에서 그 시각의 추정값을 읽어 온다(REQ-AD-030 미구현).
 * 시연에서는 **그 회차의 실측을 따라가되 오차를 얹어** 만든다.
 *
 * 실측과 무관하게 따로 뽑으면 안 된다 — 두 난수는 상관이 없어 R²가 음수로 나오고
 * (실제로 −1.8이 나왔다), 화면이 "AI가 평균만도 못하다"고 말하게 된다. 그것은 모델의
 * 성능이 아니라 시연 데이터를 만든 방식의 결과다.
 *
 * **편차 폭은 시연값이며 성능 목표가 아니다.** 원문의 목표는 R²>0.75·MAE<15%
 * `[원문 p.30]`지만, 이 값은 목표를 만족하도록 맞춘 것이 아니라 생성 방식의 부산물이다.
 *
 * 통신이 두절된 사업장은 산출 자체가 없다 — `null`이다(E3).
 */
export function getEstimated(round: AnalysisRound, code: AnalysisItemCode): number | null {
  if (!hasEstimation(round.siteId)) return null;
  if (!AI_ESTIMATED_CODES.includes(code)) return null;

  const measured = measuredMean(round, code);
  if (measured === null) return null;

  const rng = createRng(siteSeed(`${round.id}-${code}`, 77002));
  const deviation = (rng() - 0.5) * ANALYSIS_BASE[code] * ESTIMATION_ERROR_RATIO;

  return roundTo(measured + deviation, ANALYSIS_ITEMS[code].decimals);
}
