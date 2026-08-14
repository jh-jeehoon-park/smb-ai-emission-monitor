/**
 * 로그인 좌측 패널이 쓰는 값. 화면에 적는 숫자는 전부 원문 근거가 있는 것만 쓴다
 * — 첫 화면에서 지어낸 수치를 보이면 뒤 화면의 계측값까지 의심받는다.
 */
export interface Highlight {
  label: string;
  value: string;
}

export const PLATFORM_HIGHLIGHTS: readonly Highlight[] = [
  /** 5개 업종 × 2개소. 성과지표 "실증 및 상용 적용 사업장 10개소 이상" (사업계획서 p.33·37) */
  { label: '실증 사업장', value: '10개소' },
  /** 수질 8항목(pH·EC·탁도·DO·수온·색도·NO₃-N·TOC) + 설비 3항목(전류·전력·유량) (p.55) */
  { label: '계측 항목', value: '수질 8 · 설비 3' },
  /** AutoEncoder · LSTM · RandomForest · XMARL-PPO (docs/analysis/ai-model-spec.md) */
  { label: 'AI 모델', value: '4종' },
  /** 사업계획서 p.30·48. 프로토타입은 이 범위 안의 5분을 쓴다 */
  { label: '수집 주기', value: '1~10분' },
];

/** 배경 격자 간격. 값 자체에 뜻은 없고 계측 화면의 눈금 느낌만 만든다 */
export const GRID_PITCH_PX = 44;

/**
 * 좌측 패널 배경의 파형. **장식이며 데이터가 아니다** — 축·눈금·값을 붙이지 않고
 * 테두리 색으로만 그린다. 계측값처럼 읽히면 안 된다(E3·E4).
 * 사인 합성이라 서버와 클라이언트가 같은 값을 만든다(난수 금지 — hydration).
 */
export const SIGNAL_POINTS: readonly number[] = Array.from(
  { length: 64 },
  (_, i) => 50 + 25 * Math.sin(i / 4.6) + 11 * Math.sin(i / 1.8 + 1.1) + 5 * Math.sin(i / 0.9),
);
