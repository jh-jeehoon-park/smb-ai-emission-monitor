/**
 * 시드 기반 난수. 시연 데이터가 매 렌더마다 달라지면 SSR/CSR 결과가 어긋나고
 * 스크린샷도 재현되지 않는다. Math.random 대신 이 함수를 쓴다.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundTo(value: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
