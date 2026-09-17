import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TABLE_SCROLL } from './table';

/**
 * **가로 스크롤 상자는 반드시 기준면이어야 한다** `[사용자 요청 2026-09-16: 모바일 반응형]`.
 *
 * `position: static`인 상자는 안쪽의 절대배치 요소를 잘라 주지 못한다. 표의 오른쪽 끝 칸에
 * 들어 있는 `sr-only`가 720px·640px 자리에 그대로 앉아 **문서 전체를 그만큼 넓히고**, 증상은
 * «모바일에서 화면이 가로로 밀린다» 하나뿐이라 눈으로는 원인을 찾을 수 없다.
 *
 * 실측으로 두 곳이 그렇게 깨져 있었다 — `/equipment` 390px에서 문서가 675px, `/jurisdiction`
 * 360px에서 719px. `screens.md` §8의 *"390px에서 가로 스크롤 없음"* 을 어기고 있었다.
 *
 * **레이아웃은 jsdom이 재 주지 않으므로** 렌더가 아니라 소스를 읽어 «손으로 적은 상자»를 막는다.
 */
const ROOT = 'src';

/**
 * 표를 담는 상자가 아니라서 이 규약 밖에 두는 자리.
 *
 * 현황판의 사업장 카드 줄은 표가 아니라 **스냅 캐러셀**이고, 그 안에 절대배치가 없다 —
 * 좌우 화살표는 이 상자 **밖**에서 카드 줄에 걸터앉는다. 기준면을 만들 이유가 없다.
 */
const ALLOWED = new Set([
  join('src', 'shared', 'ui', 'table.ts'),
  join('src', 'widgets', 'site-wallboard', 'ui', 'site-wallboard.tsx'),
]);

/**
 * 주석은 세지 않는다. 이 규약을 **설명하는 글**에도 클래스 이름이 나오므로(가동 격자가 왜
 * 툴팁을 상자 밖에 그리는지 적어 둔 곳) 그대로 훑으면 설명한 죄로 걸린다.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = walk(ROOT);

describe('가로 스크롤 상자', () => {
  it('파일을 실제로 읽었다 — 못 읽으면 아래 검사가 조용히 통과한다', () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  it('`TABLE_SCROLL`이 기준면을 만든다', () => {
    expect(TABLE_SCROLL).toContain('relative');
    expect(TABLE_SCROLL).toContain('overflow-x-auto');
  });

  it('`overflow-x-auto`를 손으로 적은 자리가 없다', () => {
    const handwritten = FILES.filter(
      (file) => !ALLOWED.has(file) && withoutComments(readFileSync(file, 'utf8')).includes('overflow-x-auto'),
    );

    expect(handwritten, `${TABLE_SCROLL} 를 쓴다`).toEqual([]);
  });

  it('`TABLE_SCROLL`을 쓰는 곳이 실제로 있다 — 상수만 있고 아무도 안 쓰면 규약이 죽는다', () => {
    /* 낱말 경계로 본다 — `includes`는 `TABLE_SCROLL_X`로 바꿔치기해도 그대로 통과한다 */
    const users = FILES.filter(
      (file) => file !== join(ROOT, 'shared', 'ui', 'table.ts') &&
        /\bTABLE_SCROLL\b/.test(readFileSync(file, 'utf8')),
    );

    expect(users.length).toBeGreaterThanOrEqual(10);
  });
});
