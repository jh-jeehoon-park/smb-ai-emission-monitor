/**
 * Codex가 읽는 `.agents/skills`를 `.claude/skills`(원본)로 잇는다. `npm run link:skills`
 *
 * 두 도구는 스킬을 각자 정해진 폴더에서만 찾는다. 사본을 두 벌 두면 한쪽만 고쳐져 갈리므로
 * 원본은 하나로 두고 Codex 쪽은 연결로 둔다 — Codex는 연결된 스킬 폴더를 따라간다(공식 문서).
 * Windows는 관리자 권한 없이 만들 수 있는 junction을 쓴다. 연결은 기기마다 만들고 커밋하지 않는다
 * (`.gitignore`) — git이 심볼릭 링크를 Windows에서 글자 파일로 받아 깨뜨리기 때문이다.
 *
 * **정상 상태일 때만 바꾼다.** `.claude`·`.claude/skills`와 그 안의 스킬이 모두 실제 폴더이고,
 * `.agents`가 실제 폴더이거나 없으며, `.agents/skills`가 없을 때만 연결을 만든다. 그 밖의 상태는 아무것도 바꾸지 않고 무엇이 어디를
 * 가리키는지만 알린다 — 방향이 뒤집힌 연결(`npx skills`를 연결 없이 돌린 뒤 등)에서 폴더를 지우면
 * 원본이 사라지고, 상태마다 고치는 명령을 만들어 주면 경로·드라이브·셸마다 틀릴 수 있다.
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, realpathSync, symlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE_DIR = join(ROOT, '.claude');
const SOURCE = join(CLAUDE_DIR, 'skills');
const AGENTS_DIR = join(ROOT, '.agents');
const LINK = join(AGENTS_DIR, 'skills');

/**
 * 읽을 수 없는 항목. WSL이 `/mnt/c` 아래에 만든 연결은 Windows Node가 lstat하면 EACCES·EPERM이 난다 —
 * 연결로 보되(실제 폴더가 아니므로 정상 상태가 아니다) 따라가지 않는다.
 */
const UNREADABLE = { unreadable: true, isDirectory: () => false, isSymbolicLink: () => true };

/** 부모가 파일이면 POSIX는 ENOTDIR을 던진다(Windows는 ENOENT) — 둘 다 «없음»으로 본다 */
function lstatOf(path) {
  try {
    return lstatSync(path, { throwIfNoEntry: false });
  } catch (error) {
    if (error?.code === 'ENOTDIR') return undefined;
    if (error?.code === 'EACCES' || error?.code === 'EPERM') return UNREADABLE;
    throw error;
  }
}
const isRealDir = (stat) => Boolean(stat?.isDirectory() && !stat.isSymbolicLink());
/** `.native`는 디스크의 정식 표기를 돌려준다 — JS 구현은 부른 쪽 표기(`c:` / `C:`)를 그대로 돌려줘 같은 곳을 다르다고 본다 */
const realOf = (path) => realpathSync.native(path);

function describe(path) {
  const stat = lstatOf(path);
  if (!stat) return '없음';
  if (stat.unreadable) return '이 OS에서 읽을 수 없는 항목(WSL 안에서 만든 연결 등 — 만든 쪽에서 확인한다)';
  if (stat.isSymbolicLink()) {
    const target = resolve(dirname(path), readlinkSync(path));
    return existsSync(path) ? `연결 → ${target}` : `끊긴 연결 → ${target}`;
  }
  return stat.isDirectory() ? '실제 폴더' : '파일';
}

const linkedEntries = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isSymbolicLink())
    .map((entry) => join(dir, entry.name));

const problems = [];
const show = (path, why) => problems.push(`  ${relative(ROOT, path)}: ${describe(path)} — ${why}`);

/*
 * 부모(`.claude`·`.agents`)가 연결이면 그 아래 경로는 연결을 따라간 곳의 모습이라, 보고하면 «실제 폴더»처럼
 * 보여 지우는 쪽으로 이끈다. 부모가 실제 폴더(또는 없음)일 때만 그 아래를 본다.
 */
const claude = lstatOf(CLAUDE_DIR);
const claudeOk = !claude || isRealDir(claude);
if (!claudeOk) show(CLAUDE_DIR, '실제 폴더여야 한다');
const sourceIsRealDir = claudeOk && isRealDir(lstatOf(SOURCE));
if (claudeOk && !sourceIsRealDir) show(SOURCE, '원본은 실제 폴더여야 한다');
if (sourceIsRealDir) for (const path of linkedEntries(SOURCE)) show(path, '원본 안의 스킬은 실제 폴더여야 한다');

const agents = lstatOf(AGENTS_DIR);
const agentsOk = !agents || isRealDir(agents);
if (!agentsOk) show(AGENTS_DIR, '실제 폴더여야 한다(그 안의 skills만 연결이다)');

const link = agentsOk ? lstatOf(LINK) : undefined;
const reachesSource = (path) => existsSync(path) && existsSync(SOURCE) && realOf(path) === realOf(SOURCE);
const linkPointsToSource = Boolean(link?.isSymbolicLink()) && reachesSource(LINK);
const alreadyLinked = linkPointsToSource && sourceIsRealDir;
if (link && !linkPointsToSource) {
  /*
   * 실제 폴더이면 어떤 모양이든 «지우지 말고 먼저 확인»으로 알린다. 원본 자체, `npx skills`를 연결 없이 돌린 뒤의
   * 새 판, Codex에만 설치된 스킬처럼 그 폴더가 유일한 사본인 경우가 여럿이라 모양을 가려 경고하면 빠지는 경우가 생긴다.
   */
  if (isRealDir(link)) {
    show(LINK, '지우지 말고 먼저 안을 확인한다 — .claude/skills에 없는 스킬이나 새 판이 여기에만 있을 수 있다(npx skills를 연결 없이 돌린 뒤 등)');
    for (const path of linkedEntries(LINK)) show(path, '이 폴더 안의 연결이다 — 폴더째 지우면 대상까지 지워질 수 있다');
  } else {
    show(LINK, '없거나 .claude/skills로 잇는 연결이어야 한다');
  }
}

if (problems.length > 0) {
  console.error(
    [
      '정상 상태가 아니라 아무것도 바꾸지 않았습니다.',
      ...problems,
      '원본(.claude/skills 안의 실제 스킬 폴더)이 어디 있는지 확인하고 위 항목을 정리한 뒤 다시 실행하세요.',
      '  · 연결만 지우기(대상은 남는다): node -e "require(\'fs\').unlinkSync(process.argv[1])" "<연결 경로>"',
      '  · 연결이 든 폴더를 통째로 지우지 않는다 — 지우는 명령이 연결을 따라 들어가 원본까지 지울 수 있다(PowerShell 5.1의 Remove-Item -Recurse 등).',
      '  · 커밋된 원본은 그 자리의 연결을 먼저 지운 뒤 git checkout -- .claude/skills 로 되살린다.',
    ].join('\n'),
  );
  process.exit(1);
}

if (alreadyLinked) {
  console.log('이미 연결되어 있습니다: .agents/skills → .claude/skills');
  process.exit(0);
}

mkdirSync(AGENTS_DIR, { recursive: true });
/* Windows junction은 절대 경로라, 부른 쪽 경로(`subst` 드라이브 등)를 박으면 그 드라이브가 사라질 때 끊긴다 — 실제 경로를 쓴다 */
symlinkSync(process.platform === 'win32' ? realOf(SOURCE) : relative(AGENTS_DIR, SOURCE), LINK, 'junction');
console.log('연결했습니다: .agents/skills → .claude/skills');
