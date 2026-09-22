import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **좁은 화면 공통 규약** `[사용자 요청 2026-09-21: 나머지 전체 화면 반응형]`.
 *
 * 화면마다 즉흥으로 고치지 않고 **공용 부품 세 개**에서 한 번에 푼 것들이다(§19 A/B 문제).
 * 여기 있는 값이 열다섯 화면의 여백·터치·스크롤 신호를 동시에 정한다 — 한 곳이 되돌아가면
 * 전 화면이 함께 되돌아가므로, 되돌림을 눈으로 잡을 수 없다.
 *
 * **소스를 읽는다.** 값이 Tailwind 클래스 문자열이라 jsdom은 실제 픽셀을 재 주지 않는다
 * (이 저장소의 `header-layout`·`equipment-grid`가 같은 방식이다).
 */
const read = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const panel = read('src/shared/ui/panel.tsx');
const tile = read('src/shared/ui/stat-tile.tsx');
const seg = read('src/shared/ui/segmented-control.tsx');
const tooltip = read('src/shared/ui/tooltip.tsx');
const table = read('src/shared/ui/table.ts');
const css = readFileSync('src/app/globals.css', 'utf8');

describe('패널·타일 여백은 두 단이다', () => {
  it('파일을 실제로 읽었다', () => {
    expect(panel).toContain('rounded-panel');
    expect(tile).toContain('TILE_SHELL');
  });

  /**
   * 390px에서 좌우 20px씩이 **본문 358px 중 11%**를 가져가 내용폭이 318px로 깎였다(실측).
   * 화면당 패널이 2~9장이라 세로로도 같은 만큼 쌓인다.
   */
  it('좁은 화면은 16px, `lg` 이상은 20px', () => {
    for (const source of [panel, tile]) {
      expect(source).toMatch(/\bp-4\b/);
      expect(source).toMatch(/\blg:p-5\b/);
      /* 조건 없는 `p-5`가 남아 있으면 좁은 화면에서도 20px 그대로다 */
      expect(source).not.toMatch(/(?<!lg:)\bp-5\b/);
    }
  });
});

describe('세그먼트 알약은 손가락 최소를 채운다', () => {
  it('파일을 실제로 읽었다', () => {
    expect(seg).toContain('SEG_ITEM');
  });

  /**
   * 글자 12px + `py-1`이면 실높이가 **26px**이다(실측). 이 껍데기가 일곱 화면의 필터를
   * 만들므로 한 곳에서 고치면 일곱이 함께 풀린다.
   */
  it('좁은 화면에서 40px, `lg` 이상은 되돌린다', () => {
    expect(seg).toMatch(/\bmin-h-10\b/);
    expect(seg).toMatch(/\blg:min-h-0\b/);
  });

  /** 높이만 키운다 — 글자 크기를 건드리면 정보 밀도가 화면마다 달라진다 */
  it('글자 크기는 그대로다', () => {
    expect(seg).toContain('text-[12px]');
  });
});

describe('조작 버튼도 손가락 최소를 채운다', () => {
  const action = read('src/shared/ui/action-button.ts');

  it('파일을 실제로 읽었다', () => {
    expect(action).toContain('ACTION_BUTTON');
  });

  /**
   * `확인 처리`·`조치 완료`·`CSV 내보내기`가 실높이 **28px**, 화살표 글자 버튼(`상세 ›`)이
   * **22px**이었다(실측). 알람 조치는 현장에서 손가락으로 누르는 조작이라 그대로 결함이 된다.
   */
  it('좁은 화면에서 40px, `lg` 이상은 되돌린다', () => {
    for (const name of ['const BASE', 'ACTION_LINK']) {
      const decl = action.slice(action.indexOf(name), action.indexOf(name) + 400);
      expect(decl, name).toContain('min-h-10');
      expect(decl, name).toContain('lg:min-h-0');
    }
  });

  /**
   * 기준치를 손으로 넣는 화면이라 잘못 짚으면 **옆 항목의 값을 고치게 된다.** `py-1.5` +
   * 13px 글자면 실높이가 34px이었다(실측).
   */
  it('숫자 입력도 좁은 화면에서 40px을 채운다', () => {
    const field = read('src/shared/ui/number-field.tsx');
    expect(field).toContain('min-h-10');
    expect(field).toContain('lg:min-h-0');
  });

  /**
   * **`상세 ›`가 세 곳에 복사돼 있었다** — 알람 줄 · 사업장 점수표 · 카드 머리의 바로가기.
   * 셋 다 실높이 22px이었고, 이름이 없으니 한쪽만 바뀌어도 알 수 없었다.
   */
  it('화살표 글자 버튼은 세 곳이 같은 상수를 쓴다', () => {
    for (const path of [
      'src/widgets/alarms-view/ui/alarm-row.tsx',
      'src/widgets/anomaly-view/ui/site-score-table.tsx',
      'src/widgets/dashboard/ui/dashboard-view.tsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('ACTION_LINK');
      /* 상수를 들여오고도 옛 문자열이 남으면 두 부품이 나란히 산다 */
      expect(source, path).not.toContain('rounded-chip py-0.5 pl-1.5 pr-0.5');
    }
  });
});

describe('InfoTip은 보이는 크기보다 넓게 눌린다', () => {
  it('파일을 실제로 읽었다', () => {
    expect(tooltip).toContain('aria-label={label}');
  });

  /**
   * 아이콘이 16px이라 그대로 두면 누르는 자리도 16px이다(실측으로 거의 전 화면).
   * `before`로 넓히면 **줄 높이가 바뀌지 않아** 제목 옆 자리가 그대로다 —
   * 셸 헤더의 `ICON_BUTTON`이 쓰는 것과 같은 짜임이다.
   */
  it('`before`로 넓히고 기준면을 갖는다', () => {
    expect(tooltip).toMatch(/before:-inset-\d/);
    /* `relative`가 없으면 `before`가 조상 기준으로 퍼져 옆 조작을 덮는다 */
    expect(tooltip).toMatch(/\brelative\b[^'"`]*before:absolute/);
  });
});

describe('가로 스크롤 상자는 더 있다고 말한다', () => {
  /**
   * 상자가 화면을 넘기지는 않지만 휴대폰의 겹침 스크롤바는 만지기 전까지 뜨지 않아
   * **숨은 내용이 있다는 사실 자체가 화면에 없었다**(390px 실측: 상자 10개가 104~584px).
   */
  it('`TABLE_SCROLL`이 신호를 함께 든다', () => {
    expect(table).toContain('scroll-hint');
    expect(table).toContain('overflow-x-auto');
  });

  it('규칙은 `globals.css` 한 곳이 갖는다', () => {
    expect(css).toContain('.scroll-hint');
    /* 가리개가 내용과 함께 움직여야 끝에서 저절로 사라진다 — `scroll`만이면 늘 떠 있다 */
    expect(css).toMatch(/background-attachment:\s*local,\s*local,\s*scroll,\s*scroll/);
  });

  /**
   * **그림자 잉크를 박아 두면 다크에서 신호가 통째로 사라진다.** 가리개는 면 색을 따라가는데
   * 그림자만 안 보여 «오른쪽에 더 있다»를 다시 말하지 못한다 — 실제로 진한 남색을 박아 두어
   * 다크 면(`#0e141c`)에서 그렇게 됐다(캡처로 잡았다).
   */
  it('그림자 잉크가 테마를 따라 뒤집힌다', () => {
    expect(css).toContain('--scroll-hint-ink');
    /* 라디얼 둘 다 변수를 써야 한쪽만 남지 않는다 */
    expect(css.match(/radial-gradient\([^)]*var\(--scroll-hint-ink\)/g)).toHaveLength(2);
    expect(css).toMatch(/:root\[data-theme='dark'\]\s*\.scroll-hint\s*\{[^}]*--scroll-hint-ink/);
  });

  /**
   * **이미 `absolute`인 요소에 `relative`를 덧붙이지 않는다.** 히트 영역을 넓히려고 둘 다
   * 적으면 `twMerge`가 뒤엣것만 남겨 **버튼이 흐름 안으로 돌아온다** — 실제로 그렇게 해서
   * 넓은 화면의 통합 관제가 2,630 → 2,658px로 자랐다(실측으로 잡았다). 절대배치 요소는
   * 스스로 기준면이라 `relative`가 애초에 필요 없다.
   */
  it('절대배치 조작은 `relative`를 겹쳐 쓰지 않는다', () => {
    const wallboard = read('src/widgets/site-wallboard/ui/site-wallboard.tsx');
    const arrow = wallboard.slice(wallboard.indexOf("'absolute top-1/2"));
    const decl = arrow.slice(0, arrow.indexOf('}'));

    expect(decl).toContain('before:-inset-y-2');
    expect(decl).not.toMatch(/'relative\b/);
  });

  /**
   * **판 밖에 걸터앉은 버튼의 히트 영역은 바깥으로 넓히지 않는다.** 캐러셀 화살표는
   * `-ml-5`/`-mr-5`로 판 경계에 걸쳐 있어 사방으로 넓히면 그 8px이 페이지 밖으로 나간다 —
   * 실측으로 768px에서 문서가 8px 밀렸다(§8이 못박은 «가로 스크롤 없음»을 어긴다).
   */
  it('걸터앉은 화살표는 안쪽으로만 넓힌다', () => {
    const wallboard = read('src/widgets/site-wallboard/ui/site-wallboard.tsx');

    /* 사방 확장은 그 자체가 결함이다 */
    expect(wallboard).not.toContain('before:-inset-2');
    /* 왼쪽 화살표는 오른쪽으로, 오른쪽 화살표는 왼쪽으로 */
    expect(wallboard).toMatch(/left-0 -ml-3[^"]*before:-right-2[^"]*lg:-ml-5/);
    expect(wallboard).toMatch(/right-0 -mr-3[^"]*before:-left-2[^"]*lg:-mr-5/);
  });

  /** 상자 뒤 면이 흰색이 아니면 가리개 색도 함께 바꿔야 한다 — 어긋나면 색 띠가 남는다 */
  it('흰 면이 아닌 상자는 가리개 색을 덮어쓴다', () => {
    const heatmap = read('src/widgets/equipment-view/ui/status-heatmap.tsx');
    expect(heatmap).toContain('bg-surface-2');
    expect(heatmap).toContain('[--scroll-hint-bg:var(--surface-2)]');
  });
});
