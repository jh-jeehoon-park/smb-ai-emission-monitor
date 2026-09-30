import { existsSync, readFileSync } from 'node:fs';
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
 *
 * **클래스가 SCSS 모듈로 옮겨 갔다.** 열 수를 정하는 규칙은 이제 `.module.scss`에 있고, TSX는
 * 그 이름(`styles.x`)만 든다. 그래서 «어느 클래스가 어느 순서로 쓰이는가»는 TSX에서,
 * «그 클래스가 무엇으로 열 수를 정하는가»는 SCSS에서 읽어 둘을 잇는다. 모듈이 아직 없는 화면
 * (전환 중)은 예전처럼 TSX의 Tailwind 클래스를 본다 — 어느 쪽이든 같은 규약을 잠근다.
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

/** `{`에서 시작해 짝이 맞는 `}`까지의 안쪽 */
function blockAt(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  return '';
}

/** 클래스 이름 → 그 규칙의 본문. 같은 이름이 여러 번 나오면 이어 붙인다(레이어 안팎·반복 선언) */
function classRules(scss: string): Map<string, string> {
  const rules = new Map<string, string>();
  const code = scss.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of code.matchAll(/(?:^|[\s{};])\.([a-zA-Z][\w-]*)\s*\{/g)) {
    const body = blockAt(code, m.index + m[0].length - 1);
    rules.set(m[1]!, `${rules.get(m[1]!) ?? ''}\n${body}`);
  }
  return rules;
}

/** 본문 안에서 `머리 {`로 여는 하위 블록들 — 예: `@include up(xl)` · `@container (min-width: 32rem)` */
function subBlocks(body: string, head: RegExp): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(new RegExp(`${head.source}[^{;]*\\{`, 'g'))) {
    out.push(blockAt(body, m.index + m[0].length - 1));
  }
  return out;
}

const VIEWPORT = /@include\s+(?:up|down)\(|@media\b/;
const CONTAINER = /@container\b/;
const COLUMNS = /grid-template-columns/;

const viewportCols = (body: string) => subBlocks(body, VIEWPORT).some((b) => COLUMNS.test(b));
const containerCols = (body: string) => subBlocks(body, CONTAINER).some((b) => COLUMNS.test(b));
const opensContainer = (body: string) => /container-type:\s*inline-size/.test(body);

/** TSX가 쓰는 모듈 클래스를 **나오는 순서대로** — 그 순서가 곧 바깥 → 안쪽이다 */
function moduleRefs(code: string, rules: Map<string, string>) {
  return [...code.matchAll(/\bstyles\.(\w+)/g)].map((m) => ({
    name: m[1]!,
    body: rules.get(m[1]!) ?? '',
  }));
}

function moduleOf(file: string): string | null {
  const path = file.replace(/\.tsx$/, '.module.scss');
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

describe.each(FILES)('%s — 중첩 격자의 축', (file) => {
  const source = readFileSync(file, 'utf8');
  const code = withoutComments(source);
  const scss = moduleOf(file);

  if (scss === null) {
    /* 전환 전 — Tailwind 클래스가 소스에 있다 */

    /** 첫 `@container` 이후가 «중첩 격자 구간»이다 — 그 앞은 바깥 레이아웃이 정하는 자리다 */
    const at = code.indexOf('@container');

    it('파일을 실제로 읽었다', () => {
      expect(at, '@container가 없다').toBeGreaterThan(-1);
    });

    /** 하나라도 남으면 그 폭에서 열 수가 실제 폭과 어긋난다 */
    it('컨테이너 안에서 뷰포트로 열 수를 정하지 않는다', () => {
      expect(code.slice(at)).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols/);
    });

    it('바깥 2단 격자는 뷰포트로 정한다', () => {
      /*
       * **`2xl:`이 아닌 `xl:`을 골라야 한다.** 레일 폭은 두 단(`xl` 420px · `2xl` 470px)이라
       * 그냥 `xl:grid-cols-[`를 찾으면 `2xl:` 쪽이 먼저 걸려, `xl:`을 컨테이너로 바꿔도
       * 통과한다(실제로 그렇게 통과했다).
       */
      expect(code).toMatch(/(?<!2)xl:grid-cols-\[/);
      /* 컨테이너 밖에서 컨테이너에 묻는 격자가 있으면 자기 폭을 자기에게 묻는 꼴이 된다 */
      expect(code.slice(0, at)).not.toMatch(/@\[[^\]]+\]:grid-cols/);
    });
    return;
  }

  const refs = moduleRefs(code, classRules(scss));
  /** 첫 컨테이너 이후가 «중첩 격자 구간»이다 — 그 앞은 바깥 레이아웃이 정하는 자리다 */
  const at = refs.findIndex((ref) => opensContainer(ref.body));
  const outer = refs.slice(0, at);
  const nested = refs.slice(at);

  it('파일을 실제로 읽었다 — 모듈 클래스를 쓰고 그중 하나가 컨테이너를 연다', () => {
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((ref) => ref.body !== ''), '모듈에 없는 클래스를 가리킨다').toBe(true);
    expect(at, '컨테이너를 여는 클래스가 없다').toBeGreaterThan(-1);
  });

  /** 하나라도 남으면 그 폭에서 열 수가 실제 폭과 어긋난다 */
  it('컨테이너 안에서 뷰포트로 열 수를 정하지 않는다', () => {
    const offenders = nested.filter((ref) => viewportCols(ref.body)).map((ref) => ref.name);
    expect(offenders).toEqual([]);
  });

  /**
   * **반대 방향도 잠근다.** 위 검사를 「전부 `@container`로 바꿔라」로 읽으면 바깥 2단까지
   * 컨테이너로 옮기게 되는데, **그것은 뷰포트가 정해야 하는 일이다** — 레일을 만들지 말지는
   * 화면 폭의 문제이고, 자기 폭을 자기에게 묻는 꼴이 된다(`SCR-OP-001` §7: 1280px 미만에서는
   * 레일을 만들지 않는다).
   */
  it('바깥 2단 격자는 뷰포트로 정한다', () => {
    /*
     * **`2xl`이 아닌 `xl`을 골라야 한다.** 레일 폭은 두 단(`xl` 420px · `2xl` 470px)이라
     * 아무 뷰포트 블록이나 찾으면 `2xl` 쪽만 남아도 통과한다.
     */
    const xlColumns = outer.some((ref) =>
      subBlocks(ref.body, /@include\s+up\(\s*xl\s*\)/).some((b) => COLUMNS.test(b)),
    );
    expect(xlColumns).toBe(true);

    /* 컨테이너 밖에서 컨테이너에 묻는 격자가 있으면 자기 폭을 자기에게 묻는 꼴이 된다 */
    expect(outer.filter((ref) => containerCols(ref.body)).map((ref) => ref.name)).toEqual([]);
  });
});

/**
 * 판정 3칸은 **자기 컨테이너를 연다.** 오른쪽 열의 컨테이너를 그대로 쓰면 `Panel`의 패딩이
 * 빠지지 않아 임계가 카드 본문과 어긋난다.
 */
describe('예측 판정 3칸', () => {
  const code = withoutComments(readFileSync(FILES[0]!, 'utf8'));
  const refs = moduleRefs(code, classRules(moduleOf(FILES[0]!) ?? ''));
  /** 32rem에서 세 칸으로 서는 격자의 그 블록 */
  const threeUp = refs
    .flatMap((ref) => subBlocks(ref.body, /@container\s*\(\s*min-width:\s*32rem\s*\)/))
    .filter((b) => /grid-template-columns:\s*repeat\(\s*3\b/.test(b));

  it('컨테이너를 스스로 열고 그 폭으로 갈린다', () => {
    expect(refs.filter((ref) => opensContainer(ref.body)).length).toBeGreaterThanOrEqual(2);
    expect(threeUp.length).toBe(1);
  });

  /** 구분선 방향도 같은 임계를 본다 — 한쪽만 남으면 쌓인 칸에 세로선이 그려진다 */
  it('구분선 방향이 같은 임계를 본다', () => {
    expect(threeUp[0]).toMatch(/border-inline-end:\s*1px/);
    expect(threeUp[0]).toMatch(/border-bottom-width:\s*0/);
  });
});
