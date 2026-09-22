import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **중첩 격자는 뷰포트가 아니라 컨테이너로 묻는다** — `screens.md` §8이 세워 둔 규약이고,
 * 2026-09-18까지 이 화면의 두 곳이 그것을 어기고 있었다 `[사용자 결정 2026-09-18]`.
 *
 * 어긋남이 **뒤집힌 꼴로** 나타났다: 지도 레일 옆의 오른쪽 열은 1280px에서 428px뿐인데
 * 뷰포트 `xl`·`sm`이 켜져 설비 카드가 98px, 판정 칸이 143px이 됐다. 반대로 단일 열이라
 * 훨씬 넓은 640~1279px에서는 열이 더 적게 섰다(실측).
 *
 * **레이아웃은 jsdom이 재 주지 않는다.** 그래서 「몇 px인가」가 아니라 **「어느 축으로
 * 묻는가」**를 소스로 잠근다 — `table-scroll.test.ts`가 세운 선례와 같은 이유·같은 짜임이다.
 * 실제 열 수와 카드 폭은 브라우저 실측이 맡는다.
 */
const FILES = [
  'src/widgets/dashboard/ui/dashboard-view.tsx',
  'src/widgets/jurisdiction-view/ui/jurisdiction-view.tsx',
];

/**
 * 주석은 세지 않는다. **옛 배치를 설명하는 글이 그대로 남아 있어서**다 — 「한때
 * `sm:grid-cols-2 xl:grid-cols-4`였다」처럼 걷어낸 것의 이름이 근거로 적혀 있고, 그대로
 * 훑으면 설명한 죄로 걸린다.
 */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

/** 첫 `@container` 이후가 «중첩 격자 구간»이다 — 그 앞은 바깥 레이아웃이 정하는 자리다 */
function nested(text: string): string {
  const code = withoutComments(text);
  const at = code.indexOf('@container');
  expect(at, '@container가 없다').toBeGreaterThan(-1);
  return code.slice(at);
}

describe.each(FILES)('%s — 중첩 격자의 축', (file) => {
  const source = readFileSync(file, 'utf8');

  it('파일을 실제로 읽었다', () => {
    expect(source).toContain('@container');
  });

  /** 하나라도 남으면 그 폭에서 열 수가 실제 폭과 어긋난다 */
  it('컨테이너 안에서 뷰포트로 열 수를 정하지 않는다', () => {
    expect(nested(source)).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols/);
  });

  /**
   * **반대 방향도 잠근다.** 위 검사를 「전부 `@`로 바꿔라」로 읽으면 바깥 2단까지 컨테이너로
   * 옮기게 되는데, **그것은 뷰포트가 정해야 하는 일이다** — 레일을 만들지 말지는 화면 폭의
   * 문제이고, 자기 폭을 자기에게 묻는 꼴이 된다(`SCR-OP-001` §7: 1280px 미만에서는 레일을
   * 만들지 않는다).
   */
  it('바깥 2단 격자는 뷰포트로 정한다', () => {
    const code = withoutComments(source);
    /*
     * **`2xl:`이 아닌 `xl:`을 골라야 한다.** 레일 폭은 두 단(`xl` 420px · `2xl` 470px)이라
     * 그냥 `xl:grid-cols-[`를 찾으면 `2xl:` 쪽이 먼저 걸려, `xl:`을 컨테이너로 바꿔도
     * 통과한다(실제로 그렇게 통과했다).
     */
    expect(code).toMatch(/(?<!2)xl:grid-cols-\[/);

    /* 컨테이너 밖에서 컨테이너에 묻는 격자가 있으면 자기 폭을 자기에게 묻는 꼴이 된다 */
    const outer = code.slice(0, code.indexOf('@container'));
    expect(outer).not.toMatch(/@\[[^\]]+\]:grid-cols/);
  });
});

/**
 * 판정 3칸은 **자기 컨테이너를 연다.** 오른쪽 열의 컨테이너를 그대로 쓰면 `Panel`의 패딩이
 * 빠지지 않아 임계가 카드 본문과 어긋난다.
 */
describe('예측 판정 3칸', () => {
  const source = withoutComments(readFileSync(FILES[0]!, 'utf8'));

  it('컨테이너를 스스로 열고 그 폭으로 갈린다', () => {
    expect((source.match(/@container/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('@[32rem]:grid-cols-3');
  });

  /** 구분선 방향도 같은 축이어야 한다 — 한쪽만 남으면 쌓인 칸에 세로선이 그려진다 */
  it('구분선 방향이 같은 임계를 본다', () => {
    expect(source).toContain('@[32rem]:divide-x');
    expect(source).toContain('@[32rem]:divide-y-0');
  });
});
