#!/usr/bin/env node
/**
 * docs/specs 정합성 검사.
 *
 * 매 검토마다 임시 스크립트를 손으로 짜면 회차마다 검사 항목이 달라져 다른 것을 놓친다.
 * 검사를 여기 고정하고, `npm run verify:docs` 하나로만 돌린다.
 *
 * 잡지 못하는 것은 §마지막에 찍는다 — 통과가 "정합성 확인 완료"로 읽히면 안 된다.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS = join(ROOT, 'docs/specs');
const SCREENS = join(SPECS, 'screens');

/**
 * 줄바꿈을 LF로 맞춰 읽는다. core.autocrlf 환경에서 체크아웃하면 텍스트 파일이 CRLF가
 * 되는데, 내용이 같아 `git status`는 깨끗한데도 줄바꿈을 문자로 쓴 정규식이 전부 어긋난다.
 * 실제로 검사 8이 그렇게 통째로 실패했다. 읽는 지점 한 곳에서 막는다.
 *
 * `.gitattributes`가 체크아웃 단계에서 이미 LF로 고정하지만, 그 설정이 없는 사본에서도
 * 검사가 같은 답을 내야 하므로 여기서 한 번 더 맞춘다.
 */
const readText = (p) => readFileSync(p, 'utf8').split('\r\n').join('\n');
const read = (p) => readText(join(ROOT, p));
const results = [];

/** Recharts 차트 여는 태그. 속성 문자열을 2번 그룹으로 돌려준다 */
/** 개행 문자. 정규식·문자열 이스케이프를 상수로 빼 둔다 — 편집 중 섞이면 조용히 깨진다 */
const LF = String.fromCharCode(10);
const SEPARATOR = /^\|[-: |]+\|$/;

/**
 * 표 한 줄의 칸 수. 타입 유니온의 이스케이프된 파이프는 칸이 아니다 — 세면 오탐이 난다.
 *
 * **이스케이프를 문자 코드로 만든다.** 소스에 직접 적으면 편집 과정에서 조용히 한 겹
 * 벗겨진다 — 실제로 그렇게 되어 모든 줄이 0칸으로 계산되고 검사가 항상 통과했다.
 * 같은 부류로 정규식에 제어문자가 섞인 적도 있다(검사 13).
 */
const ESCAPED_PIPE = String.fromCharCode(92, 124);
const PLACEHOLDER = String.fromCharCode(0);
const cellCount = (line) =>
  line.split(ESCAPED_PIPE).join(PLACEHOLDER).split('|').length - 1;

/** 표 한 줄을 칸 배열로. 이스케이프된 파이프는 원래 문자로 되돌린다 */
const splitRow = (line) =>
  line
    .split(ESCAPED_PIPE)
    .join(PLACEHOLDER)
    .split('|')
    .slice(1, -1)
    .map((c) => c.split(PLACEHOLDER).join('|').trim());

/**
 * `deliverable-xlsx.rule.md` §4.1의 근거 태그 16종.
 *
 * `E1`~`E6`은 `frontend.rule.md` §8.1의 도메인 규칙을 가리킨다 — 우리가 정한 것이므로
 * `[설계]`와 같은 3순위지만, 어느 규칙인지가 근거의 알맹이라 번호를 남긴다.
 * **대괄호와 굵게를 다 받는다** — 저장소가 이미 98곳에서 `**E3**`으로 쓴다. 서식을 맞추려고
 * 그 전부를 고치면 바뀌는 것은 표기뿐이고 근거는 그대로다.
 *
 * `[TBD]`는 번호가 붙지 않은 것도 받는다 — 미확정을 드러내는 것 자체가 X2를 지키는 표기다.
 */
const EVIDENCE_TAG =
  /\[(원문|공정자료|데이터셋|파생|PROVISIONAL|TBD|INC-\d{2,3}|설계|회의|사용자)|(\[|\*\*)E[1-6]/;

/** 바로 위 행의 근거를 잇는 표기. 태그를 반복해 적으면 표가 읽히지 않는다 */
const DITTO = /^(같음|〃|동일)/;

/**
 * 표 첫 칸에 적힌 항목ID를 모은다.
 *
 * 세 모양을 다 받는다 — 단일 `` `MEAS-pH` `` · 범위 `` `SITE-01`~`SITE-10` `` ·
 * 나열 `` `LGL-TOC` `LGL-SS` … ``. 범위를 펼치지 않으면 사업장 10개소가 1개로 세어진다.
 */
function itemIds(text) {
  const out = new Set();
  const ID = /`([A-Z]{2,5})-([A-Za-z0-9]+)`/g;
  for (const line of text.split(LF)) {
    if (!line.startsWith('| `')) continue;
    const first = splitRow(line)[0] ?? '';
    const found = [...first.matchAll(ID)];
    if (found.length === 0) continue;
    const range = found.length === 2 && first.includes('~') && /^\d+$/.test(found[0][2]);
    if (range) {
      const width = found[0][2].length;
      for (let n = Number(found[0][2]); n <= Number(found[1][2]); n += 1)
        out.add(`${found[0][1]}-${String(n).padStart(width, '0')}`);
    } else {
      for (const m of found) out.add(`${m[1]}-${m[2]}`);
    }
  }
  return out;
}

/** 정본 헤더. `deliverable-xlsx.rule.md` §5.3·§5.4가 정한다 */
const REQ_HEADER =
  '| 요구사항ID | 대분류 | 중분류 | 요구사항명 | 상세설명 | 적용방안 및 제약사항 | 우선순위 | 수용 | 관련 | 화면·상태 |';
const DATA_HEADER =
  '| 요구사항ID | 화면ID | 데이터명 | 타입 | 단위 | 계산식/로직 | 출처·근거 | UI | UI 위치 |';
const SCREEN_DATA_HEADER = /^\| 데이터 \| [^|]+\| 단위 \| 출처·근거 \| UI 위치 \|$/;
const XLSX_TABLE = /^\| xlsx 열 \| 값 \|$/m;
const ACTION_ROWS = ['SUBMIT', 'CANCEL', 'After Action'];
const ITEM_SECTION = /^#{3,4} 3(\.\d+)? 항목 목록\s*$/m;

const CHART_TAG = /<(Area|Bar|Composed|Line|Pie|Radar|RadialBar|Scatter)Chart([^>]*)>/g;

function check(name, fn) {
  try {
    const failures = fn() ?? [];
    results.push({ name, failures });
  } catch (err) {
    results.push({ name, failures: [`검사 자체가 실패: ${err.message}`] });
  }
}

function walk(dir, ext = '.md') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, ext));
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

const specDocs = walk(SPECS);
const specText = specDocs.map((f) => readText(f)).join('\n');

// 1. 태그 등록 — [TBD-nn]·[INC-nn]이 source-inconsistencies.md에 있는가
check('태그 등록', () => {
  const registered = new Set(
    [...read('docs/requirements/source-inconsistencies.md').matchAll(/^\| ((?:TBD|INC)-\d{2}) \|/gm)].map(
      (m) => m[1],
    ),
  );
  const used = new Set();
  // `[INC-01·03·04]`처럼 축약하면 뒤 번호가 앞 태그의 접두사를 물려받는다
  for (const m of specText.matchAll(/(TBD|INC)-(\d{2})((?:·\d{2})*)/g)) {
    used.add(`${m[1]}-${m[2]}`);
    for (const n of m[3].split('·').filter(Boolean)) used.add(`${m[1]}-${n}`);
  }
  return [...used].filter((t) => !registered.has(t)).map((t) => `${t} 미등록`);
});

// 2. 인용 형식 — 발표자료는 `[원문 발표 p.nn]`으로만
check('인용 형식', () => {
  const fails = [];
  for (const f of specDocs) {
    if (f.endsWith('README.md')) continue; // 규약 본문이 반례로 인용한다
    const text = readText(f);
    text.split('\n').forEach((line, i) => {
      if (line.includes('`[발표 p.')) fails.push(`${relative(ROOT, f)}:${i + 1} 축약형 [발표 p.`);
    });
  }
  return fails;
});

// 3. 화면 수 — 목록·문서·라우트가 같은가
//    미구현 화면은 문서만 있고 라우트가 없다. 그것은 정상이므로 라우트 대조에서 뺀다.
check('화면 수', () => {
  const rows = (read('docs/specs/screens.md').match(/^\| SCR-/gm) ?? []).length;
  const files = readdirSync(SCREENS).filter((f) => f.endsWith('.md'));
  const fails = [];
  if (rows !== files.length) fails.push(`screens.md ${rows}행 ≠ screens/ ${files.length}파일`);

  // 화면 문서의 `| 구현 |` 행이 **미구현**이면 라우트가 없어야 한다
  const implemented = files.filter(
    (f) => !/\|\s*구현\s*\|\s*\*\*미구현\*\*/.test(readText(join(SCREENS, f))),
  );
  // 라우트는 nav 설정이 아니라 실제 page.tsx로 센다 — 로그인처럼 메뉴에 없는 화면이 있다
  const pages = walk(join(ROOT, 'src/app'), 'page.tsx');
  if (implemented.length !== pages.length)
    fails.push(`구현 표기 ${implemented.length}개 ≠ 라우트 ${pages.length}개`);

  // 셸 안의 화면만 사이드바에 오른다. 화면을 (shell)에 넣고 메뉴에 안 넣으면 갈 길이 없다
  const shellPages = pages.filter((p) => p.includes('(shell)')).length;
  const navItems = (read('src/widgets/app-shell/config/navigation.ts').match(/href: '\//g) ?? []).length;
  if (shellPages !== navItems)
    fails.push(`셸 라우트 ${shellPages}개 ≠ 사이드바 메뉴 ${navItems}개`);
  return fails;
});

// 4. FR 커버리지 — 원문 요구 42건이 전부 추적표에
check('FR 커버리지', () => {
  const req = read('docs/specs/requirements.md');
  const missing = [];
  for (let i = 1; i <= 42; i += 1) {
    const id = `FR-${String(i).padStart(2, '0')}`;
    if (!req.includes(id)) missing.push(`${id} 누락`);
  }
  return missing;
});

// 5. 문서 링크 — 상대 링크가 실존하는가
//    docs/ 뿐 아니라 CLAUDE.md·규칙 파일도 본다. 규칙이 docs/specs/를 가리키기 시작했다.
check('문서 링크', () => {
  const targets = [...walk(join(ROOT, 'docs')), join(ROOT, 'CLAUDE.md')];
  if (existsSync(join(ROOT, '.claude/rules'))) targets.push(...walk(join(ROOT, '.claude/rules')));
  const fails = [];
  for (const f of targets) {
    if (!existsSync(f)) continue;
    const dir = dirname(f);
    for (const m of readText(f).matchAll(/\]\(([^)#][^)]*)\)/g)) {
      const target = m[1].split('#')[0];
      if (!target || /^https?:/.test(target)) continue;
      // `[TBD](현 단계 미도입 — …)`처럼 링크가 아닌 괄호 주석이 있다. 경로 모양만 검사한다.
      if (/\s/.test(target) || !/[/.]/.test(target)) continue;
      if (!existsSync(join(dir, decodeURIComponent(target))))
        fails.push(`${relative(ROOT, f)} → ${target}`);
    }
  }
  return fails;
});

// 6. 필드 커버리지 — 타입 선언 수가 data-definition §2.2 표와 같은가
//    (필드를 추가하고 문서를 안 고치면 여기서 잡힌다)
check('필드 커버리지', () => {
  const table = new Map(
    // 슬라이스 이름에 하이픈이 들어간다(`water-analysis`). `\w`만 쓰면 그 행을 못 읽는다
    [...read('docs/specs/data-definition.md').matchAll(/^\| ([\w-]+) \| (\d+) \|/gm)].map((m) => [
      m[1],
      Number(m[2]),
    ]),
  );
  const fails = [];
  // 슬라이스 목록을 적어 두면 새 슬라이스를 만들 때 여기에 더하는 것을 잊는다. 디렉터리에서 센다.
  const slices = readdirSync(join(ROOT, 'src/entities'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(ROOT, `src/entities/${e.name}/model/types.ts`)))
    .map((e) => e.name);
  for (const slice of slices) {
    const declared = (
      read(`src/entities/${slice}/model/types.ts`).match(/^\s+[a-zA-Z][a-zA-Z0-9]*\??:/gm) ?? []
    ).length;
    const documented = table.get(slice);
    if (documented === undefined) fails.push(`${slice} — §2.2 표에 행이 없다`);
    else if (documented !== declared)
      fails.push(`${slice} — 코드 ${declared} ≠ 문서 ${documented}`);
  }
  return fails;
});

// 7. 문서 규격 — document-template.rule.md
check('문서 규격', () => {
  const fails = [];
  for (const f of specDocs) {
    const text = readText(f);
    const name = relative(ROOT, f);
    for (const field of ['문서명', '버전', '작성일', '기반 문서']) {
      if (!new RegExp(`^\\| ${field} \\|`, 'm').test(text)) fails.push(`${name} — 문서정보 '${field}' 없음`);
    }
    if (!/^\| 버전 \| 날짜 \| 작성자 \| 변경 내용 \|/m.test(text)) fails.push(`${name} — 변경 이력 헤더 없음`);
  }
  return fails;
});

// 8. 화면 목록 정합 — screens.md와 각 화면 문서가 같은 말을 하는가
check('화면 목록 정합', () => {
  const list = read('docs/specs/screens.md');
  const kinds = new Map(
    [...list.matchAll(/^\| \d+\.\d+ \| (SCR-(?:AD|OP|GU|CO)-\d{3}) \|[^|]+\|[^|]+\| ([^|]+)\|/gm)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  );
  const perms = new Map(
    [...list.matchAll(/^\| (SCR-(?:AD|OP|GU|CO)-\d{3}) \| [^|]+\| ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)].map((m) => [
      m[1],
      [m[2], m[3], m[4]].map((s) => s.trim()).join(' / '),
    ]),
  );
  const fails = [];
  for (const file of readdirSync(SCREENS).filter((f) => f.endsWith('.md'))) {
    const text = readText(join(SCREENS, file));
    const id = file.match(/SCR-(?:AD|OP|GU|CO)-\d{3}/)?.[0];
    if (!id) continue;
    const kind = text.match(/^\| 화면 구분 \| ([^|]+)\|/m)?.[1].trim();
    if (kind !== kinds.get(id)) fails.push(`${id} 화면구분 — 목록 '${kinds.get(id)}' ≠ 문서 '${kind}'`);
    const pm = text.match(/\| 관리자 \| 운영자 \| 게스트 \|\n\|[-| ]+\|\n\| ([^|]+)\| ([^|]+)\| ([^|]+)\|/);
    const perm = pm ? [pm[1], pm[2], pm[3]].map((s) => s.trim()).join(' / ') : null;
    if (perm !== perms.get(id)) fails.push(`${id} 권한 — 목록 '${perms.get(id)}' ≠ 문서 '${perm}'`);
  }
  return fails;
});

// 9. 자릿수 하드코딩 — 같은 값이 화면마다 다르게 반올림되는 결함을 막는다(E1)
//    `toFixed(1)`뿐 아니라 `decimals={1}`·`decimals: 1`도 같은 결함이다.
check('자릿수 하드코딩', () => {
  // SVG 좌표 정밀도이지 도메인 값이 아니다. 두 파일 모두 계측값을 표시하지 않는다.
  const ALLOWED = ['src/shared/ui/sparkline.tsx', 'src/widgets/login-view/ui/brand-panel.tsx'];
  const PATTERNS = [
    [/toFixed\(\s*\d/, 'toFixed(리터럴)'],
    [/decimals\s*=\s*\{\s*\d/, 'decimals={리터럴}'],
    [/decimals:\s*\d/, 'decimals: 리터럴'],
  ];
  const fails = [];
  for (const dir of ['src/widgets', 'src/entities', 'src/features']) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const f of [...walk(full, '.tsx'), ...walk(full, '.ts')]) {
      const name = relative(ROOT, f).replace(/\\/g, '/');
      if (name.includes('.test.') || ALLOWED.includes(name)) continue;
      readText(f)
        .split('\n')
        .forEach((line, i) => {
          for (const [re, label] of PATTERNS) if (re.test(line)) fails.push(`${name}:${i + 1} ${label}`);
        });
    }
  }
  return fails;
});

// 10. 임시값 위치 — `PROVISIONAL_` 값은 provisional.ts 한 파일에만 (CLAUDE.md 임시값 규약 1·2)
//     확정되면 한 파일만 고쳐 전 화면이 바뀌게 하려는 규약이다. 흩어지면 한쪽만 바뀐다.
check('임시값 위치', () => {
  const fails = [];
  for (const f of [...walk(join(ROOT, 'src'), '.ts'), ...walk(join(ROOT, 'src'), '.tsx')]) {
    const name = relative(ROOT, f).replace(/\\/g, '/');
    if (name === 'src/shared/config/provisional.ts' || name.includes('.test.')) continue;
    for (const m of readText(f).matchAll(/^export (?:const|type|function) (PROVISIONAL_\w+)/gm)) {
      fails.push(`${name} — ${m[1]}는 provisional.ts에 있어야 한다`);
    }
  }
  return fails;
});

// 11. 데이터셋 근거 — `[데이터셋 경로]`가 실제로 있는 파일·폴더를 가리키는가
//     원문 페이지와 달리 이건 셀 수 있다. 없는 경로를 근거로 적으면 근거가 있다는 착각만 남는다.
check('데이터셋 근거', () => {
  const fails = [];
  for (const m of specText.matchAll(/\[데이터셋\s+([^\]]+)\]/g)) {
    // 한 표기에 여러 경로를 `·`로 이어 쓸 수 있다
    for (const raw of m[1].split('·')) {
      const path = raw.trim().replace(/^`|`$/g, '');
      if (!path.startsWith('docs/')) continue; // 설명문이지 경로가 아니다
      if (!existsSync(join(ROOT, path))) fails.push(`${path} — 없는 경로`);
    }
  }
  return fails;
});

// 12. 판독 대장 — 이미지 페이지가 상태 없이 남아 있지 않은가
//     "원문에 없다"는 판단을 텍스트 추출만 보고 두 번 틀렸다(무단방류·업종별 조합).
//     그림 속 글자는 추출되지 않으므로, 어느 쪽을 실제로 열어 봤는지 대장으로 관리한다.
check('판독 대장', () => {
  const doc = read('docs/requirements/source-inconsistencies.md');
  const rows = [...doc.matchAll(/^\| (발표|계획) p\.(\d+) \| (\d+) \| ([^|]*) \| ([^|]*) \|/gm)];
  if (rows.length === 0) return ['§5.4 판독 대장이 없다'];

  const fails = [];
  const unread = rows.filter((m) => m[4].trim() === '미판독');
  // 완료 행은 결과가 비어 있으면 안 된다 — 열어 보고 아무것도 안 적은 것과 같다
  for (const m of rows) {
    const status = m[4].trim();
    const note = m[5].trim();
    if (!status) fails.push(`${m[1]} p.${m[2]} — 상태가 비어 있다`);
    else if (status.startsWith('완료') && (!note || note === '—'))
      fails.push(`${m[1]} p.${m[2]} — 완료인데 판독 결과가 없다`);
  }
  // 미판독은 실패가 아니라 진행 상황이다. 다만 몇 쪽 남았는지는 늘 보이게 한다
  if (unread.length) {
    console.log(`      (진행) 판독 ${rows.length - unread.length}/${rows.length}쪽 · 남은 ${unread.length}쪽`);
  }
  return fails;
});

// 13. 차트 포커스 — Recharts 차트가 Tab 대상으로 남아 있지 않은가
//     `accessibilityLayer`(기본 켜짐)는 차트 SVG에 `tabindex="0" role="application"`을 붙이고
//     **포커스만으로 툴팁을 띄운 뒤 고정한다.** 마우스로는 지울 수 없어 화면에 얼어붙는다.
//     두 번 보고된 결함이라 여기서 막는다. 키보드·AT 경로는 `ChartFigure`가 맡는다.
check('차트 포커스', () => {
  const fails = [];
  /* `walk`의 기본 확장자는 `.md`다 — 넘기지 않으면 소스를 한 건도 읽지 않고 통과한다 */
  for (const file of walk(join(ROOT, 'src'), '.tsx')) {
    const text = readText(file);
    for (const m of text.matchAll(CHART_TAG)) {
      if (!m[2].includes('accessibilityLayer={false}'))
        fails.push(`${relative(ROOT, file)} — <${m[1]}Chart>에 accessibilityLayer={false} 없음`);
    }
  }
  return fails;
});

// 14. 표 모양 — 행의 칸 수가 헤더와 같은가
//     xlsx로 옮길 때 칸이 모자라면 열이 밀린다. 사람 눈으로는 보이지 않는다 —
//     실제로 SCR-OP-002·SCR-AD-001에서 어긋난 행 11개를 이 검사가 찾았다.
check('표 모양', () => {
  const fails = [];
  for (const file of specDocs) {
    const lines = readText(file).split(LF);
    for (let i = 0; i < lines.length; i += 1) {
      // 헤더는 바로 다음 줄이 구분선이어야 한다 — 다른 표의 행을 헤더로 오인하지 않게
      if (!lines[i].startsWith('|') || !SEPARATOR.test(lines[i + 1] ?? '')) continue;
      const want = cellCount(lines[i]);
      for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j += 1) {
        if (cellCount(lines[j]) !== want)
          fails.push(`${relative(ROOT, file)}:${j + 1} — 칸 ${cellCount(lines[j])} ≠ 헤더 ${want}`);
      }
    }
  }
  return fails;
});

// 15. 표 헤더 통일 — 같은 뜻의 표가 같은 열을 쓰는가
//     생성기가 헤더 문자열로 표를 찾는다. 갈리면 그 표를 못 찾거나 열이 어긋난다.
check('표 헤더 통일', () => {
  const fails = [];
  for (const m of read('docs/specs/requirements.md').matchAll(/^\| 요구사항ID \|.*$/gm)) {
    if (m[0] !== REQ_HEADER) fails.push(`requirements.md — 요구사항 표 헤더가 다르다`);
  }
  for (const m of read('docs/specs/data-definition.md').matchAll(/^\| 요구사항ID \|.*$/gm)) {
    // 계측 사양표(범위·정확도)는 성격이 달라 예외다
    if (m[0].includes('범위') && m[0].includes('정확도')) continue;
    if (m[0] !== DATA_HEADER) fails.push(`data-definition.md — 데이터 표 헤더가 다르다`);
  }
  for (const file of readdirSync(SCREENS).filter((f) => f.endsWith('.md'))) {
    const text = readText(join(SCREENS, file));
    /*
     * **헤더인지는 다음 줄이 구분선인지로 가른다.** `| 데이터 | 진유원 6,528시간…`처럼
     * 다른 표의 행이 `데이터`로 시작하는 경우가 있어, 첫 칸만 보면 오탐이 난다(실제로 났다).
     */
    const rows = text.split(LF);
    rows.forEach((line, k) => {
      if (!line.startsWith('| 데이터 |') || !SEPARATOR.test(rows[k + 1] ?? '')) return;
      if (!SCREEN_DATA_HEADER.test(line))
        fails.push(`${file}:${k + 1} — §4 표 헤더가 템플릿과 다르다`);
    });
    /* **제목으로 본다.** 변경 이력에도 '항목 목록'이 적혀 있어 본문 포함 여부로는 못 잡는다 */
    if (!ITEM_SECTION.test(text)) fails.push(`${file} — '항목 목록' 절이 없다(X4)`);
    if (!XLSX_TABLE.test(text)) fails.push(`${file} — 'xlsx 열 / 값' 표가 없다`);
    for (const key of ACTION_ROWS) {
      if (!text.includes(`| ${key} |`)) fails.push(`${file} — ${key} 행이 없다`);
    }
  }
  return fails;
});

// 16. 근거 태그 누락 — 데이터 행에 §4 태그가 하나라도 있는가 (X1)
//     "근거 없는 행을 쓰지 않는다"를 사람이 320행에서 셀 수는 없다.
check('근거 태그 누락', () => {
  const fails = [];
  const targets = [
    ['docs/specs/items.md', () => true],
    ['docs/specs/data-definition.md', (h) => h === DATA_HEADER],
    ...readdirSync(SCREENS)
      .filter((f) => f.endsWith('.md'))
      .map((f) => [`docs/specs/screens/${f}`, (h) => SCREEN_DATA_HEADER.test(h)]),
  ];
  for (const [rel, wanted] of targets) {
    const lines = read(rel).split(LF);
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].startsWith('|') || !SEPARATOR.test(lines[i + 1] ?? '')) continue;
      if (!wanted(lines[i])) continue;
      const cells = splitRow(lines[i]);
      /* 근거 열의 위치는 표마다 다르다 — 이름으로 찾는다 */
      const at = cells.findIndex((c) => c === '근거' || c === '출처·근거');
      if (at < 0) continue;
      for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j += 1) {
        const cell = splitRow(lines[j])[at] ?? '';
        if (!EVIDENCE_TAG.test(cell) && !DITTO.test(cell))
          fails.push(`${rel}:${j + 1} — 근거 없음(X1)`);
      }
    }
  }
  return fails;
});

// 17. 항목 단위 완전성 — 선언한 개수와 실제 항목 행이 맞는가, 화면이 없는 항목을 가리키지 않는가
check('항목 단위 완전성', () => {
  const fails = [];
  const items = read('docs/specs/items.md');
  const dict = itemIds(items);

  /* §2.2 집합 요약이 스스로 개수를 선언한다. 그 숫자와 실제 행이 갈리면 어느 쪽이 맞는지 알 수 없다 */
  const declared = new Map();
  for (const m of items.matchAll(/^\| ((?:`[A-Z]{2,5}`(?: · )?)+) \| [^|]+\| ([^|]+)\|/gm)) {
    const codes = [...m[1].matchAll(/`([A-Z]{2,5})`/g)].map((c) => c[1]);
    const counts = m[2].split('·').map((n) => Number.parseInt(n.trim(), 10));
    codes.forEach((code, k) => declared.set(code, counts[k]));
  }
  if (declared.size === 0) return ['items.md §2.2 집합 요약을 못 찾았다'];

  for (const [code, want] of declared) {
    const got = [...dict].filter((id) => id.startsWith(`${code}-`)).length;
    if (got !== want) fails.push(`items.md — ${code} 선언 ${want} ≠ 항목 ${got}`);
  }
  const total = Number.parseInt(items.match(/\*\*(\d+)\*\* \(집합 \d+종\)/)?.[1] ?? '-1', 10);
  if (total !== dict.size) fails.push(`items.md — 합계 ${total} ≠ 항목 ${dict.size}`);

  /* 화면이 사전에 없는 항목을 가리키면 그 행은 근거를 잃는다.
     역방향(사전에 있으나 화면에 없음)은 검사하지 않는다 — 설비 지표 5종처럼
     설비 카드의 **형태** 안에서 읽히는 항목이 있어 오탐이 난다(§6.1의 "반복되는 최소 단위"). */
  for (const file of readdirSync(SCREENS).filter((f) => f.endsWith('.md'))) {
    for (const id of itemIds(readText(join(SCREENS, file)))) {
      if (!dict.has(id)) fails.push(`${file} — ${id}가 items.md에 없다`);
    }
  }
  return fails;
});

// 18. 잔재 ID — 타 프로젝트 양식에서 딸려 온 ID 접두사 (X5)
//     커밋 2c0c07e가 실제로 밟은 함정이다. xlsx에는 지금도 살아 있다.
//
//     **`REQ-GU-`는 넣지 않는다.** 잔재 목록에 적어 뒀지만 `GU`는 우리 게스트 구분 코드다
//     (README §4.2). 타 프로젝트도 게스트에 같은 코드를 써서 접두사만으로는 가를 수 없다 —
//     그쪽 잔재는 `청약 공고 목록`처럼 내용으로 찾아야 한다.
check('잔재 ID', () => {
  const fails = [];
  for (const file of specDocs) {
    for (const m of readText(file).matchAll(/\b(ZB-|REQ-(?:US|EM)-|SCR-EM-)/g)) {
      fails.push(`${relative(ROOT, file)} — 잔재 접두사 ${m[1]}`);
    }
  }
  return fails;
});

// ── 출력 ──
let failed = 0;
for (const { name, failures } of results) {
  if (failures.length === 0) {
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}`);
    for (const f of failures) console.log(`      ${f}`);
  }
}

console.log('');
console.log(failed === 0 ? `${results.length}종 전부 통과` : `${failed}종 실패`);
console.log('');
console.log('─ 이 스크립트가 잡지 못하는 것 ─');
console.log('  · 태그 번호가 맞는 내용인지   → source-inconsistencies.md의 해당 행을 읽어야 함');
console.log('  · 원문 페이지 번호가 맞는지   → 원문을 읽어야 함');
console.log('  · 수치가 원문 값인지          → 원문을 읽어야 함');
console.log('  통과는 "형식이 어긋나지 않았다"는 뜻이지 "근거가 맞다"는 뜻이 아니다.');

process.exit(failed === 0 ? 0 : 1);
