import type { TbFailure } from '@/shared/api/thingsboard';

/**
 * 안내·오류 화면의 문구 한 벌 `[사용자 요청 2026-09-15]`.
 *
 * **화면마다 다시 적지 않는다.** 같은 상황이 자리마다 다른 말로 보이면 사용자는 둘을 다른
 * 사건으로 읽는다 — `TELEMETRY_STATUS_LABELS`가 계측 원천에서 먼저 세운 규약이고 여기가
 * 그것을 따른다.
 *
 * **계측 부재의 어휘를 빌리지 않는다**(**E4**). `수신 없음`·`통신 두절`·`산출 불가`·`결측`은
 * 전부 «계측을 받아 봤는데 없었다»는 뜻이다. 없는 주소·막힌 화면·무너진 렌더는 계측과 아무
 * 상관이 없으므로 그 말을 쓰면 없는 장애를 주장하게 된다. `notices.test.ts`가 지킨다.
 */
export const NOTICE_NOT_FOUND = {
  code: '404',
  title: '찾을 수 없는 주소입니다',
  description:
    '주소가 바뀌었거나 없는 화면입니다. 주소를 다시 확인하시거나 아래 버튼으로 첫 화면에서 다시 시작해 주세요.',
} as const;

/**
 * 렌더가 무너졌을 때. **원문 오류 메시지를 화면에 뿌리지 않는다** — 프로덕션에서는 서버
 * 메시지가 가려지고(`error.digest`만 온다), 가려지지 않는 개발에서도 사용자가 읽을 말이 아니다.
 */
export const NOTICE_ERROR = {
  code: '500',
  title: '화면을 그리지 못했습니다',
  description:
    '일시적인 문제일 수 있습니다. 다시 시도해 보시고, 계속 같은 화면이 나오면 이 아래의 오류 번호를 알려 주세요.',
} as const;

/**
 * 역할에 닫힌 화면. **`{screen}`·`{roles}`는 부르는 쪽이 채운다** — 화면 이름과 허용 역할은
 * `NAV_ITEMS`·`SCREEN_ROLES`가 들고 있고, 그것을 문자열로 다시 적으면 두 곳이 갈린다.
 *
 * **이것은 인가가 아니다**(**E6** 예외). 서버가 없어 역할은 브라우저가 들고 있을 뿐이고, 이
 * 화면은 «막았다»가 아니라 «여기는 당신 자리가 아니다»를 말한다. 그 성격은 화면 문서
 * `SCR-CO-002` §7에 적는다.
 */
export const NOTICE_FORBIDDEN = {
  code: '403',
  title: '볼 수 없는 화면입니다',
  /** `{screen}` = 화면 이름 · `{roles}` = 허용 역할을 `·`로 이은 것 */
  template: '「{screen}」은 {roles} 역할의 화면입니다. 지금 역할로는 열 수 없습니다.',
} as const;

export function forbiddenDescription(screen: string, roles: readonly string[]): string {
  return NOTICE_FORBIDDEN.template
    .replace('{screen}', screen)
    .replace('{roles}', roles.join(' · '));
}

/**
 * 계측을 못 받았을 때 화면이 하는 말 `[사용자 결정 2026-09-15]`.
 *
 * **`errors.ts`가 내건 약속을 여기서 갚는다** — 그 파일 첫 줄이 *"실패의 종류. 화면이 각각
 * 다르게 보여야 한다"* 라 적어 두고 5종을 갈랐는데, 화면은 `unconfigured` 하나만 따로 대우하고
 * 나머지 넷을 «내장 데이터 · 서버 미연결» 한 문구로 뭉치고 있었다.
 *
 * **`unconfigured`는 여기 없다.** 접속 정보를 두지 않은 것은 오류가 아니라 폴백 신호이고,
 * 그 상태에 상시 고지를 띄우면 **진짜 두절이 그 안에 묻힌다**(헤더 배지의 `내장 데이터`가
 * 이미 말한다). 없는 것이 곧 «띠를 띄우지 않는다»는 뜻이므로 `Partial`이 아니라 키를 빼 둔다 —
 * `notices.test.ts`가 나머지 넷이 전부 있는지 센다.
 */
export const TELEMETRY_FALLBACK_NOTICES: Record<
  Exclude<TbFailure, 'unconfigured'>,
  { message: string; retry: boolean }
> = {
  /** 재시도까지 실패했다. 다시 눌러 볼 값이 있다 — `isRetriable`이 참인 유일한 종류다 */
  unreachable: {
    message: '계측 서버에 닿지 못해 내장 데이터를 그립니다.',
    retry: true,
  },
  /** 토큰 갱신·재로그인까지 실패했다. 서버가 돌아오면 다음 시도가 성공한다 */
  unauthorized: {
    message: '계측 서버 인증에 실패해 내장 데이터를 그립니다.',
    retry: true,
  },
  /** 그 사업장만 장비가 없다. 다시 보내도 같은 답이라 버튼을 두지 않는다 */
  notFound: {
    message: '이 사업장의 장비가 계측 서버에 등록되어 있지 않아 내장 데이터를 그립니다.',
    retry: false,
  },
  /** 우리 코드 버그다. 사용자가 다시 눌러 고칠 수 있는 것이 아니다 */
  badRequest: {
    message: '요청이 잘못되어 내장 데이터를 그립니다.',
    retry: false,
  },
};

/**
 * **접속은 됐는데 일부 계열이 오지 않는 경우** `[사용자 확인 2026-09-15]`.
 *
 * 2026-09-15에 실제로 겪었다 — 에뮬레이터가 유출 수질 채널 이름을 바꾸면서(`pH` → `pHOut`)
 * 우리가 옛 이름으로 물었고, **없는 키는 오류가 아니라 빈 배열**이라(명세 §7.1) 헤더는
 * `계측 서버 수신 중`인데 수질 8종이 전부 비었다. 접속 판정과 값의 유무가 갈리는 이 조합을
 * 화면이 말하지 못해 진단이 반나절 늦었다.
 */
export function unreceivedNotice(count: number): string {
  return `계측 ${count}종이 서버에서 오지 않습니다. 나머지는 수신 중입니다.`;
}

/** 다시 받는 동안. 누른 사람에게 **무엇을 기다리는지** 말한다 */
export const NOTICE_RETRY_LABEL = '다시 시도';
export const NOTICE_RETRYING_LABEL = '다시 받는 중';
