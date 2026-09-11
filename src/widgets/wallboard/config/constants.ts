/*
 * 이 화면은 `SCR-AD-006`이다. **`SCR-AD-004`가 아니다** — 그 번호는 세 번 쓰였다 세 번
 * 비었다(시스템 설정 → `SCR-OP-010` 이관 · 처리 흐름 폐기 · 2026-09-01의 현황판 폐기).
 * 되쓰면 세 개의 역사와 충돌한다(`README` §4.1: *"글자는 역사이고 뜻은 표다"*).
 *
 * 화면 ID와 경로 문자열은 **여기 두지 않는다.** 접근 판정은 `entities/user`의 `SCREEN_ROLES`
 * 가, 경로는 `app-shell/config/navigation.ts`가 갖는다 — 위젯끼리는 서로 import 할 수 없어
 * (FSD §8) 여기 둬도 셸이 읽지 못하고, 읽지 못하는 상수는 두 곳에 같은 문자열을 적는 일만 된다.
 */

/**
 * 화면이 스스로 다시 그리는 주기(ms).
 *
 * 계측은 `useSiteSeries`가 1분마다 받아 오지만 **시각 표기**(머리줄의 시계)는 그것과 별개다.
 * 초 단위로 흐르는 시계를 두지 않는 이유는 §8 `모션`과 같다 — **벽에서 종일 움직이는 것은
 * 눈에 남는다.** 분이 바뀔 때만 갱신한다.
 */
export const WALL_CLOCK_TICK_MS = 30_000;

/**
 * 값이 바뀐 것을 알리는 하이라이트가 사라지는 시간(ms).
 *
 * `[사용자 요청 2026-09-10: 데이터가 변동 될 때에 대한 가벼운 모션은 있었으면 좋겠음]`.
 *
 * **새 무한 반복이 아니다.** 한 번 켜졌다 꺼지는 전이이고, §8 `모션`이 막는 것은 «무한
 * 반복을 새로 만드는 것»이다.
 */
export const WALL_FLASH_MS = 900;

/** 큰 수가 0에서 올라오는 시간(ms). `shared`의 `CountUp`과 같은 값이라 리듬이 갈리지 않는다 */
export const WALL_COUNT_MS = 1200;

/**
 * **벽 치수** — 이 화면만의 단.
 *
 * `shared/ui/type-scale.ts`는 «카드 안 값»을 두 단(`VALUE_LG` 22 · `VALUE_MD` 18)으로
 * 못박았고 그 규칙은 그대로다. 그쪽은 **60cm 앞의 화면**을 전제한 크기이고, 여기는 **2~3m
 * 밖**이라 같은 자리에 다른 숫자가 필요하다.
 *
 * **`shared`에 올리지 않는다.** 소비처가 이 화면 하나뿐이고, 공용으로 올리면 다른 화면이
 * 큰 값을 쓰기 시작해 §8이 억제해 온 «어휘 확산»이 된다 — `inout-compare`의 `HERO_VALUE`가
 * 같은 이유로 같은 자리에 있다.
 *
 * **§8 `글자 최소`(12px)는 그대로다** — 여기서는 위로만 벗어난다.
 */
export const WALL_VALUE_XL = 'text-[52px] font-bold leading-none tracking-tight';
export const WALL_VALUE_LG = 'text-[34px] font-bold leading-none tracking-tight';
export const WALL_VALUE_MD = 'text-[24px] font-bold leading-none tracking-tight';
/** 패널 제목. 레퍼런스의 머리줄 글자 크기다 */
export const WALL_TITLE = 'text-[17px] font-bold leading-tight tracking-tight text-fg';
/** 항목 이름 */
export const WALL_LABEL = 'text-[15px] font-semibold leading-tight text-fg';
/** 곁의 사실(단위·기준·시각). 이 화면의 **최소 글자**이며 §8 `글자 최소`(12px)를 넘는다 */
export const WALL_META = 'text-[13px] leading-tight';

/**
 * **이상 점수 반원 게이지의 치수.**
 *
 * 한 곳에 모으는 이유는 `inout-compare`의 `GAUGE_GEOMETRY`와 같다 — 스켈레톤·빈 상태·실물이
 * 같은 값을 봐야 값이 도착할 때 칸 높이가 튀지 않는다.
 *
 * 반원은 **9시 → 3시**, 위쪽으로 돈다(`sweep-flag=1`). 중심이 아래쪽에 있어 남는 아래 공간이
 * 가운데 숫자의 자리가 된다.
 */
export const WALL_ARC = {
  width: 300,
  height: 168,
  cx: 150,
  cy: 150,
  r: 116,
  stroke: 20,
  /** 바늘이 호 바깥으로 나오는 길이 — 레퍼런스의 계기 바늘 질감 */
  needleOver: 10,
  /** 바늘이 중심에서 떨어져 시작하는 거리. 중심까지 그으면 부채꼴이 된다 */
  needleFrom: 52,
} as const;

/**
 * 누적 추이선의 높이(px) — **상수로 두는 이유가 있다.**
 *
 * 선 그래프는 `preserveAspectRatio="none"`이라 **높이가 확정되지 않으면 viewBox의 비율로
 * 되돌아간다.** 폭이 1,000px을 넘는 칸에서 그 비율은 높이도 1,000px이 넘는다는 뜻이라,
 * `h-full`·`flex-1`로 두면 카드가 화면을 뚫고 나간다(첫 판본이 실제로 그랬다).
 *
 * 감싼 상자와 viewBox가 **같은 값을 봐야** 선이 세로로 늘어나거나 눌리지 않는다.
 */
export const WALL_SPARK_H = 150;

/**
 * 추이선의 솎기 간격 — **표본 수가 아니라 분으로 적는다**(§8 `솎기`).
 *
 * 1,440점을 900px에 그리면 픽셀당 1.6점이라 선이 «털»이 된다. 수집 주기가 바뀌어도 이 값은
 * 같은 시간을 뜻한다 — 표본 수를 박아 두면 주기가 바뀔 때 구간이 조용히 늘거나 줄어든다
 * (`[INC-111]`).
 */
export const WALL_SPARK_BUCKET_MINUTES = 6;

/** 계측 칸 안의 작은 추이선 높이(px). 누적 추이(`WALL_SPARK_H`)보다 낮다 */
export const WALL_CELL_SPARK_H = 64;

/**
 * SVG 경로 좌표를 몇 자리까지 적는가.
 *
 * **계측값의 표시 자릿수가 아니다** — 그쪽은 **E1**의 관할이라 `MEASUREMENT_ITEMS`와
 * `PROVISIONAL_DECIMALS`가 갖는다. 이것은 `d` 속성에 들어가는 **좌표의 정밀도**이고, 자리를
 * 줄이는 이유는 문자열이 짧아져 경로가 가벼워지기 때문이다.
 *
 * 상수로 빼 두는 까닭은 `verify:docs` 검사 9가 `toFixed(리터럴)`을 자릿수 하드코딩으로 잡기
 * 때문이다 — 그 검사는 좌표와 계측값을 가릴 수 없고, **가릴 수 없는 것이 옳다**(둘을 눈으로
 * 구분하게 두면 언젠가 진짜 자릿수가 섞여 들어온다). 이름이 그 구분을 대신한다.
 */
export const SVG_COORD_PRECISION = 2;

/**
 * 벽에 올리는 미확인 알람 줄 수.
 *
 * **목록을 다 싣지 않는다** — 정본은 `/alarms`이고 여기가 답하는 것은 «지금 무엇이 밀려
 * 있나»까지다. 건수는 곁의 큰 숫자가 이미 말하므로, 이 줄들은 **무엇인지**만 보여 준다.
 */
export const WALL_ALARM_ROWS = 3;
