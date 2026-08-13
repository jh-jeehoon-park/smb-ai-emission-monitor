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

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const results = [];

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
const specText = specDocs.map((f) => readFileSync(f, 'utf8')).join('\n');

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
    const text = readFileSync(f, 'utf8');
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
    (f) => !/\|\s*구현\s*\|\s*\*\*미구현\*\*/.test(readFileSync(join(SCREENS, f), 'utf8')),
  );
  const routes = (read('src/widgets/app-shell/config/navigation.ts').match(/href: '\//g) ?? []).length;
  if (implemented.length !== routes)
    fails.push(`구현 표기 ${implemented.length}개 ≠ 라우트 ${routes}개`);
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
    for (const m of readFileSync(f, 'utf8').matchAll(/\]\(([^)#][^)]*)\)/g)) {
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
    [...read('docs/specs/data-definition.md').matchAll(/^\| (\w+) \| (\d+) \|/gm)].map((m) => [
      m[1],
      Number(m[2]),
    ]),
  );
  const fails = [];
  for (const slice of ['site', 'measurement', 'anomaly', 'prediction', 'equipment', 'alarm', 'optimization']) {
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
    const text = readFileSync(f, 'utf8');
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
    [...list.matchAll(/^\| \d\.0 \| (SCR-(?:AD|OP|GU)-\d{3}) \|[^|]+\|[^|]+\| ([^|]+)\|/gm)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  );
  const perms = new Map(
    [...list.matchAll(/^\| (SCR-(?:AD|OP|GU)-\d{3}) \| [^|]+\| ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)].map((m) => [
      m[1],
      [m[2], m[3], m[4]].map((s) => s.trim()).join(' / '),
    ]),
  );
  const fails = [];
  for (const file of readdirSync(SCREENS).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(SCREENS, file), 'utf8');
    const id = file.match(/SCR-(?:AD|OP|GU)-\d{3}/)?.[0];
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
  const ALLOWED = ['src/shared/ui/sparkline.tsx']; // SVG 좌표 정밀도이지 도메인 값이 아니다
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
      readFileSync(f, 'utf8')
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
    for (const m of readFileSync(f, 'utf8').matchAll(/^export (?:const|type|function) (PROVISIONAL_\w+)/gm)) {
      fails.push(`${name} — ${m[1]}는 provisional.ts에 있어야 한다`);
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
