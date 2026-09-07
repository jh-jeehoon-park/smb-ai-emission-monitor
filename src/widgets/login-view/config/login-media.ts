/**
 * 로그인 배경 영상 `[사용자 지시 2026-08-25]`.
 *
 * `public/`에 있는 파일이라 경로가 곧 URL이다. **여기 한 곳에서만 적는다** — 파일 이름을
 * 컴포넌트에 박아 두면 영상을 갈아 끼울 때 어디를 고쳐야 하는지 찾아야 한다.
 */
export const LOGIN_VIDEO_SRC = '/login-movie_1.mp4';

/** 영상이 무엇을 담고 있는지. 보조기술에는 숨기지만 대체 설명은 남긴다 */
export const LOGIN_VIDEO_LABEL = '방류구에서 물이 흘러나오는 장면';

/** 아이디를 기억해 두는 자리. 값은 사용자가 적은 아이디 문자열뿐이다 */
export const REMEMBERED_ID_KEY = 'smb-remembered-id';

/* ───────────────────────────────────────────────────────────────────────────
 * 여기부터 아래는 **시연용 임시물이다.**
 *
 * TODO(영상 확정 시 제거): `[사용자 요청 2026-09-07]` — 시연에서 수처리 영상 여러 개를
 * 보여 준 뒤 하나로 픽스할 예정이고, **그때 이 블록과 `LoginVideoPicker`를 함께 지운다.**
 *
 * 지울 때 할 일은 셋뿐이다.
 *   ① 이 구분선 아래를 전부 지운다
 *   ② `login-view.tsx`에서 `LoginVideoPicker`와 그 상태를 지운다(`LOGIN_VIDEO_SRC`만 남는다)
 *   ③ 고른 영상 파일만 `public/`에 남기고 나머지 `login-movie_*.mp4`를 지운다
 *
 * **골라 둔 값이 남아 있으면 지운 뒤에도 그 영상이 뜬다.** 저장 키를 함께 지우므로
 * 그럴 일이 없다 — 위 `LOGIN_VIDEO_SRC`가 유일한 원천으로 돌아간다.
 * `login-media.test.ts`가 이 세 자리를 함께 못박는다.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * 고를 수 있는 영상.
 *
 * **이름을 «영상 N»으로 둔다.** 2·3번의 내용을 확인하지 않았으므로 장면을 적지 않는다 —
 * 1번의 설명(`LOGIN_VIDEO_LABEL`)은 확인된 것이고, 나머지에 그럴듯한 설명을 붙이면
 * 화면이 보지 않은 것을 말하게 된다. 고르는 사람은 지금 보이는 화면으로 판단한다.
 *
 * 첫 항목이 기본값이고 `LOGIN_VIDEO_SRC`와 같아야 한다 — 갈리면 저장값이 없는 첫 방문과
 * 저장값을 지운 뒤가 서로 다른 영상을 띄운다.
 */
export const LOGIN_VIDEOS = [
  { src: LOGIN_VIDEO_SRC, name: '영상 1' },
  { src: '/login-movie_2.mp4', name: '영상 2' },
  { src: '/login-movie_3.mp4', name: '영상 3' },
] as const;

/**
 * 고른 영상을 기억해 두는 자리. 값은 `src` 문자열이다.
 *
 * 번호가 아니라 경로를 담는 이유: 목록이 줄어도(파일을 지워도) 없는 번호를 가리키지 않는다 —
 * 아래 `resolveLoginVideo`가 목록에 없는 값을 기본값으로 떨군다.
 */
export const LOGIN_VIDEO_KEY = 'smb-login-video';

/**
 * 저장값을 실제로 띄울 영상으로 바꾼다.
 *
 * **저장값을 믿지 않는다.** 파일을 지우거나 목록을 줄인 뒤에도 옛 경로가 남아 있으면
 * 배경이 통째로 검게 뜬다(`<video>`가 404를 조용히 먹는다). 목록에 있는 것만 통과시킨다.
 */
export function resolveLoginVideo(stored: string | null): string {
  return LOGIN_VIDEOS.some((video) => video.src === stored) ? stored! : LOGIN_VIDEO_SRC;
}
