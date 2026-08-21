/**
 * 공정도 좌표. 이 화면 전용 레이아웃이라 `shared`가 아니라 위젯이 갖는다
 * (지도 도형은 여러 화면이 쓰는 지리 데이터라 shared에 있다).
 *
 * **좌표는 전부 정수 상수다.** 계산해서 SVG 속성에 넣으면 Node와 Chrome의 부동소수
 * 말단 비트가 달라 속성 문자열이 갈리고 hydration이 깨진다(shared/lib/geo.ts와 같은 이유).
 */
export const NODE_WIDTH = 140;

/**
 * 노드 높이. 단계마다 **그 지점의 계측값**을 적어야 해서 두 줄을 더 받았다
 * `[회의 2026-08-20: 각 공정도에 따른 데이터가 표출되는 모니터링]`.
 */
export const NODE_HEIGHT = 138;
export const NODE_GAP = 34;
export const DIAGRAM_PADDING = 18;

export const DIAGRAM_HEIGHT = 262;
export const NODE_TOP = 40;

/** 수조 바닥 띠의 두께. 물이 담기는 곳이라는 것만 전하고 값을 뜻하지 않는다 */
export const BASIN_FLOOR = 14;

/**
 * 그린 노드 수에 맞춘 폭.
 *
 * **상수로 고정하지 않는다.** 사업장마다 켠 단계가 다르므로(`[회의 2026-08-20]`) 노드 수가
 * 바뀐다 — 6개로 박아 두면 5단계에서 오른쪽에 빈 칸이 남고 단계를 끄면 더 벌어진다.
 */
export function diagramWidth(count: number): number {
  return DIAGRAM_PADDING * 2 + NODE_WIDTH * count + NODE_GAP * Math.max(0, count - 1);
}

/**
 * 왼쪽에서 몇 번째 칸인가.
 *
 * **`order`가 아니라 그린 순서(index)로 잡는다.** 사용자가 중간 단계를 끄면 `order`에는
 * 구멍이 생기고 노드 사이가 벌어진다 — 흐름도가 끊긴 것처럼 보인다.
 */
export function nodeX(index: number): number {
  return DIAGRAM_PADDING + index * (NODE_WIDTH + NODE_GAP);
}

export function nodeCenterY(): number {
  return NODE_TOP + NODE_HEIGHT / 2;
}
