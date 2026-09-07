import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LOGIN_VIDEOS,
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
   * **2·3번의 장면을 적지 않는다.** 확인하지 않은 내용을 설명으로 붙이면 화면이 보지 않은
   * 것을 말하게 된다 — 1번의 설명만 확인된 것이다.
   */
  it('이름이 장면을 주장하지 않는다', () => {
    for (const video of LOGIN_VIDEOS.slice(1)) {
      expect(video.name).toMatch(/^영상 \d$/);
    }
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
