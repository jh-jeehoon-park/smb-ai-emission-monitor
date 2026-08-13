/** 원문(사업계획서 p.27)이 제시한 자릿수 그대로 보인다. 반올림하면 원문 값이 아니게 된다 */
const R2_DECIMALS = 3;

/** 원문에 값이 없는 항목(TOC)에 쓰는 표기 */
const R2_NOT_SPECIFIED = '원문 미규정';

/**
 * 원문은 TN·TP의 R²만 제시한다(사업계획서 p.27). TOC는 `null`이며 값을 지어내지 않는다(E3).
 * 두 화면이 같은 값을 각자 포맷하면 자릿수·문구가 갈린다.
 */
export function formatR2(r2: number | null): string {
  return r2 === null ? R2_NOT_SPECIFIED : r2.toFixed(R2_DECIMALS);
}
