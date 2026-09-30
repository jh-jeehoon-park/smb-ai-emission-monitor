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
 *
 * 열 수는 모듈 SCSS가 정하고 마크업은 그 규칙을 어느 요소에 붙이는지만 정한다 — 둘 다 읽는다.
 */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** 옛 배치를 설명하는 주석에 뷰포트 문턱이 근거로 남아 있다 — 주석은 빼고 본다 */
const scss = stripComments(
  readFileSync('src/widgets/equipment-panel/ui/equipment-panel.module.scss', 'utf8'),
);
const markup = stripComments(
  readFileSync('src/widgets/equipment-panel/ui/equipment-panel.tsx', 'utf8'),
);

/** 한 규칙의 본문. 안쪽 블록(`@container …`)을 두 겹까지 품는다 */
const ruleBody = (name: string) =>
  scss.match(new RegExp(String.raw`\.${name}\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}`))?.[1] ?? '';

const grid = ruleBody('grid');

describe('설비 카드 격자', () => {
  it('파일을 실제로 읽었다', () => {
    expect(grid).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
    expect(markup).toContain('styles.grid');
  });

  it('뷰포트로 열 수를 정하지 않는다', () => {
    expect(grid).not.toMatch(/@include (up|down)\(/);
    expect(grid).not.toMatch(/@media/);
  });

  /**
   * 임계는 **카드 하한 190px**에서 나온다 — `site-wallboard`의 190px 문턱이 「이름 왼쪽 ·
   * 뱃지 오른쪽 한 줄」이 성립하는 실측 하한이고 이 카드가 그 구성을 베꼈다.
   * 2열 400px → 카드 194px · 4열 832px → 카드 199px. 값을 옮기려면 문서도 함께 고치게 된다.
   */
  it('컨테이너 임계 두 단으로 갈린다', () => {
    expect(grid).toMatch(
      /@container \(min-width: 25rem\)\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);\s*\}/,
    );
    expect(grid).toMatch(
      /@container \(min-width: 52rem\)\s*\{\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);\s*\}/,
    );
  });

  it('스스로 컨테이너를 연다', () => {
    expect(ruleBody('container')).toContain('container-type: inline-size');
    expect(markup).toContain('className={styles.container}');
  });

  /**
   * **컨테이너를 여는 요소가 격자와 같은 요소여서는 안 된다.**
   *
   * 컨테이너 질의는 **조상**만 본다 — 같은 요소에 컨테이너와 `@container` 분기를 함께 적으면
   * 조용히 아무 분기도 걸리지 않는다. 터지지도 않고 경고도 없어 **«세로로 길다»로만 보이는**
   * 종류라, 이 검사가 그 함정을 막는다. 규칙 하나에 둘을 적는 것도, 한 요소에 두 규칙을
   * 함께 붙이는 것도 같은 함정이다.
   */
  it('컨테이너를 여는 요소가 격자가 아니다', () => {
    expect(grid).not.toContain('container-type');
    expect(markup).not.toMatch(/className=\{[^}\n]*styles\.container\b[^}\n]*styles\.grid\b/);
    expect(markup).not.toMatch(/className=\{[^}\n]*styles\.grid\b[^}\n]*styles\.container\b/);
    /* 격자는 컨테이너의 바로 안쪽 요소다 */
    expect(markup).toMatch(/className=\{styles\.container\}>\s*<StaggerGroup className=\{styles\.grid\}>/);
  });
});
