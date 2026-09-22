import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **설비 카드 격자는 자기 폭을 보고 접힌다** `[사용자 결정 2026-09-18]`.
 *
 * 한때 `sm:grid-cols-2 xl:grid-cols-4`였고 결과가 뒤집혀 있었다 — 통합 관제의 오른쪽 열은
 * 1280px에서 428px뿐인데 `xl`이 켜져 **카드가 98px(안쪽 66px)**이 됐고, 반대로
 * 640~1279px(단일 열이라 훨씬 넓다)에서는 2열만 섰다(실측).
 *
 * 이 위젯은 **네 화면**이 쓴다(통합 관제 · 관내 감독 · 자사 현황 · 설비 예지보전).
 * 뒤의 둘은 컨테이너 안이 아니라, 위젯이 스스로 열지 않으면 **질의가 한 번도 맞지 않아
 * 1열로 굳는다** — 화면에는 「좀 세로로 길다」로만 보여 눈으로는 잡히지 않는다.
 */
const SOURCE = 'src/widgets/equipment-panel/ui/equipment-panel.tsx';
const source = readFileSync(SOURCE, 'utf8');

/** 옛 배치를 설명하는 주석에 `sm:grid-cols-2`가 근거로 남아 있다 */
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('설비 카드 격자', () => {
  it('파일을 실제로 읽었다', () => {
    expect(code).toContain('grid-cols-1');
  });

  it('뷰포트로 열 수를 정하지 않는다', () => {
    expect(code).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols/);
  });

  /**
   * 임계는 **카드 하한 190px**에서 나온다 — `site-wallboard`의 `@[190px]`이 「이름 왼쪽 ·
   * 뱃지 오른쪽 한 줄」이 성립하는 실측 하한이고 이 카드가 그 구성을 베꼈다.
   * 2열 400px → 카드 194px · 4열 832px → 카드 199px. 값을 옮기려면 문서도 함께 고치게 된다.
   */
  it('컨테이너 임계 두 단으로 갈린다', () => {
    expect(code).toContain('@[25rem]:grid-cols-2');
    expect(code).toContain('@[52rem]:grid-cols-4');
  });

  it('스스로 컨테이너를 연다', () => {
    expect(code).toContain('@container');
  });

  /**
   * **컨테이너를 여는 요소가 격자와 같은 요소여서는 안 된다.**
   *
   * 컨테이너 질의는 **조상**만 본다 — 같은 요소에 `@container`와 `@[25rem]:`을 함께 적으면
   * 조용히 아무 분기도 걸리지 않는다. 터지지도 않고 경고도 없어 **«세로로 길다»로만 보이는**
   * 종류라, 이 검사가 그 함정을 막는다.
   */
  it('컨테이너를 여는 요소가 격자가 아니다', () => {
    expect(code).not.toMatch(/@container[^"'\n]*\bgrid-cols-/);
  });
});
