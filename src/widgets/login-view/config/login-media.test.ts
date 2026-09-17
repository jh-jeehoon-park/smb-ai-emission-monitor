import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LOGIN_POSTER_PORTRAIT_SRC,
  LOGIN_POSTER_SRC,
  LOGIN_VIDEOS,
  LOGIN_WIDE_QUERY,
  LOGIN_VIDEO_KEY,
  LOGIN_VIDEO_SRC,
  resolveLoginVideo,
} from './login-media';

/**
 * **영상 선택은 시연용 임시물이다** `[사용자 요청 2026-09-07]`.
 *
 * 지울 때 세 자리를 함께 지워야 하고(목록·화면·파일), 하나라도 남으면 조용히 틀린다 —
 * 저장값만 남으면 지운 뒤에도 그 영상이 뜨고, 파일만 남으면 쓰지 않는 65MB가 배포에 실린다.
 * 그래서 «임시»라는 사실과 지우는 방법을 검사가 함께 들고 있는다.
 */
const config = readFileSync('src/widgets/login-view/config/login-media.ts', 'utf8');
const view = readFileSync('src/widgets/login-view/ui/login-view.tsx', 'utf8');

/**
 * JPEG의 가로·세로를 파일에서 직접 읽는다 — **이미지 라이브러리를 새로 들이지 않으려고** 쓴다.
 *
 * 크기는 `SOF` 표지(`0xFFC0`~`0xFFCF`, 재시작·산술 표지 넷 제외)의 뒤 4바이트에 세로·가로
 * 순서로 들어 있다. 그 앞의 표지들은 길이를 스스로 들고 있어 건너뛰기만 하면 된다.
 */
function jpegSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  let at = 2;

  while (at < bytes.length) {
    if (bytes[at] !== 0xff) throw new Error(`${path}: JPEG 표지가 아니다`);

    const marker = bytes[at + 1]!;
    const isSizeMarker = 0xc0 <= marker && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSizeMarker) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };

    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error(`${path}: 크기 표지를 찾지 못했다`);
}

describe('시연용 영상 선택 — 지울 것임을 코드가 말한다', () => {
  it('두 파일이 제거 표식을 갖는다', () => {
    for (const [name, source] of [
      ['config', config],
      ['view', view],
    ] as const) {
      expect(source, name).toContain('TODO(영상 확정 시 제거)');
    }
  });

  /** 근거 없는 TODO는 방치된다 — 무엇 때문에 두었는지가 지울 때의 판단 기준이다 */
  it('제거 표식에 근거가 붙어 있다', () => {
    expect(config).toContain('[사용자 요청 2026-09-07]');
  });
});

describe('목록', () => {
  it('세 편이고 경로가 겹치지 않는다', () => {
    expect(LOGIN_VIDEOS).toHaveLength(3);
    expect(new Set(LOGIN_VIDEOS.map((v) => v.src)).size).toBe(3);
  });

  /** 갈리면 저장값이 없는 첫 방문과 저장값을 지운 뒤가 다른 영상을 띄운다 */
  it('첫 항목이 기본값과 같다', () => {
    expect(LOGIN_VIDEOS[0]!.src).toBe(LOGIN_VIDEO_SRC);
  });

  /** 경로가 곧 URL이다 — 없는 파일을 가리키면 배경이 통째로 검게 뜬다 */
  it('세 파일이 public에 있다', () => {
    for (const video of LOGIN_VIDEOS) {
      expect(existsSync(`public${video.src}`), video.src).toBe(true);
    }
  });

  /**
   * **장면을 적지 않는다.** 확인하지 않은 내용을 설명으로 붙이면 화면이 보지 않은 것을
   * 말하게 된다.
   *
   * 한때 이 검사가 `slice(1)`이라 **첫 항목만 예외**였다 — 그 자리에 장면을 아는 영상(1번)이
   * 있었기 때문이다. 2026-09-17에 영상 3이 맨 앞으로 오면서 그 전제가 사라졌다.
   */
  it('이름이 장면을 주장하지 않는다', () => {
    for (const video of LOGIN_VIDEOS) {
      expect(video.name, video.src).toMatch(/^영상 \d$/);
    }
  });

  /**
   * **번호는 보이는 순서를 따른다** `[사용자 요청 2026-09-17: 영상 순서는 유지하고
   * 영상 1, 영상 2, 영상 3 으로 변경]`.
   *
   * 한때 반대로 못박아 두었다 — 번호를 파일에 붙이고 목록을 `3 · 1 · 2`로 두는 검사였고,
   * 근거는 «시연에서 부르던 이름이 다른 파일을 가리키게 된다»였다. 사용자가 보이는 순서대로
   * 부르기로 정해 그 근거가 걷혔다.
   */
  it('이름이 보이는 순서대로 1부터 매겨진다', () => {
    expect(LOGIN_VIDEOS.map((video) => video.name)).toEqual(['영상 1', '영상 2', '영상 3']);
  });

  /**
   * **이름의 번호와 파일 이름의 번호가 다르다** — 고른 영상이 `login-movie_3.mp4`인데
   * 맨 앞이라 «영상 1»이다. 둘을 같다고 믿고 파일을 지우면 엉뚱한 것을 지운다.
   */
  it('고른 영상은 파일로 지목한다', () => {
    expect(LOGIN_VIDEO_SRC).toBe('/login-movie_3.mp4');
    expect(LOGIN_VIDEOS[0]!.src).toBe('/login-movie_3.mp4');
    expect(LOGIN_VIDEOS[0]!.name).toBe('영상 1');
  });
});

/**
 * **좁은 화면은 영상을 내려받지 않는다** `[사용자 결정 2026-09-17]`.
 *
 * `lg` 미만에서는 유리 기둥이 화면 전체를 덮고 `blur(20px)`이 걸려 **영상이 한 번도 보이지
 * 않는데** 65.2MB를 쓰고 있었다(실측: 390·640·768px에서 패널이 화면의 100%). 그 자리를
 * 정지 이미지가 받는다 — 실측으로 모바일 전송량이 **65.2MB → 55KB**가 됐다.
 */
describe('좁은 화면의 정지 이미지', () => {
  it('포스터 두 장이 public에 있다 — 없으면 배경이 통째로 비어 뜬다', () => {
    for (const src of [LOGIN_POSTER_SRC, LOGIN_POSTER_PORTRAIT_SRC]) {
      expect(existsSync(`public${src}`), src).toBe(true);
    }
  });

  /**
   * **세로본이 실제로 세로여야 한다** `[사용자 지적 2026-09-17: 화질이 좋지 않아보임]`.
   *
   * 그 지적의 원인이 바로 이것이었다 — 가로 그림 한 장(1080×608)으로 두 폭을 겸하다가
   * 세로 화면에서 네 배로 늘어났다. 파일 이름에 `portrait`이 붙어 있어도 **뽑을 때 자르기를
   * 빠뜨리면 조용히 가로본이 들어앉고**, 증상은 «흐리다» 하나뿐이라 눈으로는 원인이 보이지
   * 않는다. 그래서 이름이 아니라 **픽셀을 본다.**
   *
   * **가로·세로 최솟값이 아니라 «확대율»을 본다.** 그 지적의 알맹이가 확대율이고, 변끼리는
   * 서로를 보상한다 — 가로가 넉넉해도 세로가 짧으면 `object-cover`가 세로에 맞춰 늘린다.
   * 한때 `가로 ≥ 1080 · 세로 ≥ 1920`으로 적고 주석에 «1.25배를 넘지 않는 선»이라 달았는데,
   * **그 최솟값에서의 실제 확대율은 1.32배다**(계산으로 확인). 재는 것을 그대로 적는다.
   */
  it('세로본이 세로로 잘려 있고 확대율이 1.25배를 넘지 않는다', () => {
    const { width, height } = jpegSize(`public${LOGIN_POSTER_PORTRAIT_SRC}`);
    expect(height, '세로본인데 가로가 더 길다').toBeGreaterThan(width);

    /* 기준 화면은 390×844 · DPR 3 — 흔한 세로 휴대폰이고 이 작업의 실측 기준이었다 */
    const screen = { width: 390 * 3, height: 844 * 3 };
    const upscale = Math.max(screen.width / width, screen.height / height);
    expect(upscale, `${width}×${height}이면 ${upscale.toFixed(2)}배로 늘어난다`).toBeLessThanOrEqual(
      1.25,
    );
  });

  /** 가로본은 `<video poster>`라 최적화를 거치지 않고 그대로 나간다 — 크기와 무게를 함께 본다 */
  it('가로본이 가로이고 그대로 나가도 될 무게다', () => {
    const { width, height } = jpegSize(`public${LOGIN_POSTER_SRC}`);
    expect(width, '가로본인데 세로가 더 길다').toBeGreaterThan(height);
    expect(width).toBeGreaterThanOrEqual(1920);
    expect(statSync(`public${LOGIN_POSTER_SRC}`).size).toBeLessThan(400_000);
  });

  /**
   * **고른 영상이 바뀌면 이미지도 다시 뽑아야 한다.** 안 뽑으면 좁은 화면과 넓은 화면이
   * 서로 다른 장면을 보인다 — 둘을 나란히 놓고 보지 않으면 눈에 띄지 않는다.
   *
   * **두 장이 됐으므로 명령도 둘이어야 한다.** 한 줄만 남으면 다음 사람이 가로본만 갈아
   * 끼우고, 세로 화면에는 옛 영상의 장면이 그대로 남는다.
   */
  it('다시 뽑는 **명령**이 두 장 모두 적혀 있다', () => {
    /* 낱말 «ffmpeg»만 찾으면 설명 문장에도 있어 통과한다 — 실제로 돌릴 수 있는 꼴을 본다 */
    expect(config).toMatch(/ffmpeg .*-frames:v 1.*login-poster\.jpg/);
    expect(config).toMatch(/ffmpeg .*crop=.*-frames:v 1.*login-poster-portrait\.jpg/);
  });

  /**
   * **감추는 것으로는 데이터가 줄지 않는다** — `display:none`이어도 브라우저가 그대로
   * 내려받는다(실측: 보이는 영상 1건 · `display:none` 1건 · 마운트 안 함 0건). 그래서 CSS가
   * 아니라 **조건부 마운트**여야 하고, 이 검사가 그 되돌림을 막는다.
   */
  it('영상을 CSS로 감추지 않고 조건부로 마운트한다', () => {
    expect(view).toContain('{isWide && <LoginVideo');
    expect(view).not.toMatch(/<video[^>]*className="[^"]*md:block/);
  });

  /** 선택기는 PC에서만 — 좁은 화면에는 고를 영상 자체가 없다 */
  it('배경 선택기가 좁은 화면에서 감춰진다', () => {
    expect(view).toContain('hidden items-center gap-1.5');
    expect(view).toContain('md:flex');
  });
});

/**
 * **분기 폭이 세 곳에 흩어져 있다** `[사용자 요청 2026-09-17: 768px 기준 아래로 Mobile
 * 반응형을 잡을 것]` — 이 상수 · 화면의 Tailwind 접두사 · `globals.css`의 유리 미디어 쿼리.
 *
 * 한 곳만 옮기면 **한 화면이 두 판본으로 그려진다**: 영상은 붙었는데 기둥은 아직 카드이거나,
 * 그 반대다. 폭 하나에서만 보이고 그 폭을 열어 보지 않으면 눈에 띄지 않는다.
 *
 * 앱 셸의 사이드바(1024px)와는 **일부러 다르다** `[사용자 결정 2026-09-17: 로그인 화면만]` —
 * 한때 같은 값이라 `shared/config`에 함께 두었던 것이 이 검사가 생긴 계기다.
 */
describe('넓은 화면 기준이 세 곳에서 같다', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');

  /** Tailwind 기본값. 상수의 `rem` 값이 어느 접두사인지 정한다 */
  const TAILWIND_STEPS: Record<string, string> = {
    '40rem': 'sm',
    '48rem': 'md',
    '64rem': 'lg',
    '80rem': 'xl',
  };

  const width = LOGIN_WIDE_QUERY.match(/min-width:\s*([\d.]+rem)/)?.[1];
  const prefix = width ? TAILWIND_STEPS[width] : undefined;

  it('상수가 Tailwind 단 위에 놓여 있다 — 아니면 클래스로 옮길 수 없다', () => {
    expect(prefix, `${LOGIN_WIDE_QUERY}는 Tailwind 기본 단이 아니다`).toBeDefined();
  });

  it('화면이 그 단의 접두사로 갈린다', () => {
    expect(view).toContain(`${prefix}:flex`);
    expect(view).toContain(`${prefix}:hidden`);
    expect(view).toContain(`${prefix}:grid-cols-[`);
  });

  /**
   * **«둘 중 어느 판본인가»를 가르는 클래스는 한 접두사여야 한다.**
   *
   * 열을 세울지(`grid-cols`)·감출지(`hidden`/`flex`)·카드를 풀지(`mx-0`/`rounded-none`)가
   * 그것이다. 하나라도 다른 단에 남으면 **그 사이 폭에서 반쪽짜리 화면**이 그려진다.
   *
   * 더 넓은 단(`lg`·`xl`)에 남는 것은 **같은 판본 안의 다듬기**뿐이다 — 기둥 폭 한 단
   * (`lg:grid-cols-…`)과 타이포. 그래서 `grid-cols`는 이 검사에서 뺀다: 768px에서 기둥을
   * 420px로 고정하느라 두 단에 걸쳐 있고, 그것은 판본을 가르는 것이 아니다.
   */
  it('판본을 가르는 접두사가 두 벌이 아니다', () => {
    const switches = /(sm|md|lg|xl):(hidden|flex(?![\w-])|mx-0|rounded-none)/g;
    const used = new Set([...view.matchAll(switches)].map((m) => m[1]));
    expect([...used].sort()).toEqual([prefix]);
  });

  it('유리 미디어 쿼리가 같은 폭이다', () => {
    expect(css).toContain(`@media (min-width: ${width})`);
    expect(css).not.toContain('@media (min-width: 64rem)');
  });

  /** 좁은 화면 배경이 넓은 화면에서 가장 작은 판본으로 떨어지는 기준도 같은 폭이다 */
  it('그림 `sizes`도 같은 폭을 본다', () => {
    expect(view).toContain(`sizes="(min-width: ${width}) 1px, 100vw"`);
  });
});

describe('resolveLoginVideo — 저장값을 믿지 않는다', () => {
  it('목록에 있는 값은 그대로 쓴다', () => {
    expect(resolveLoginVideo(LOGIN_VIDEOS[2]!.src)).toBe(LOGIN_VIDEOS[2]!.src);
  });

  /** 파일을 지우거나 목록을 줄인 뒤 옛 경로가 남아 있으면 배경이 검게 뜬다 */
  it.each([null, '', '/지운-영상.mp4'])('목록에 없는 %s는 기본값으로 떨군다', (stored) => {
    expect(resolveLoginVideo(stored)).toBe(LOGIN_VIDEO_SRC);
  });
});

/**
 * **감속 설정을 켠 사용자에게는 영상이 멈춰 있어야 한다.**
 *
 * 영상을 갈아 끼우면 새 파일이 자동재생으로 다시 도는데, 마운트에서 한 번만 멈추면
 * 그 순간부터 설정이 무시된다. 선택 기능이 생기면서 만들어진 자리다.
 */
describe('감속 설정', () => {
  it('멈추는 effect가 고른 영상에 매달려 있다', () => {
    expect(view).toMatch(/videoRef\.current\?\.pause\(\);\s*\n\s*\}, \[videoSrc\]\);/);
  });

  /** `src`만 바꾸면 브라우저가 첫 영상을 그대로 둔다 */
  it('영상 엘리먼트가 `key`로 다시 읽힌다', () => {
    expect(view).toContain('key={videoSrc}');
  });
});

describe('저장', () => {
  /** 아이디 저장과 같은 규율 — 시크릿 모드에서는 손대는 것만으로 예외가 난다 */
  it('읽기·쓰기를 모두 감싼다', () => {
    const guarded = view.slice(view.indexOf('const readChosenVideo'), view.indexOf('const rememberId'));
    expect((guarded.match(/try \{/g) ?? []).length).toBe(2);
    expect((guarded.match(/\} catch \{/g) ?? []).length).toBe(2);
  });

  it('저장 키가 아이디 키와 다르다', () => {
    expect(LOGIN_VIDEO_KEY).not.toBe('smb-remembered-id');
  });
});
