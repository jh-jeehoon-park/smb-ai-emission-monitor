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
 * **벽 치수 — 화면 높이에 비례한다** `[사용자 결정 2026-09-11: 유동 치수 — 화면을 꽉 채움]`.
 *
 * 고정 px이던 판본은 **1920×1080에서만 의도대로 보였다.** 1366×768에서는 기여 변수 5줄 중
 * 1줄만 남고 알람 패널이 통째로 잘렸으며, 3840×2160에서는 값 글자가 화면 높이의 2.4%까지
 * 작아져(1080에서는 4.8%) 2~3m 판독이 무너졌다. 열 비중도 좌우 합이 57% ↔ 20%로 갈렸다 —
 * 전부 브라우저 실측이다.
 *
 * **세로는 `vh`, 가로는 비율이다.** 이 화면은 «스크롤 없는 한 화면»이라 **세로가 제약**이고,
 * 세로 치수를 화면 높이에 매면 어느 모니터에서도 정확히 맞는다. 가로는 `%`·`fr`이라 남는
 * 띠 없이 채운다.
 *
 * **비율이 다른 모니터에서는 칸 모양이 달라진다** — 16:9가 아니면 가로가 늘거나 줄기 때문이고,
 * 그것이 «꽉 채움»을 고른 대가다(고정 캔버스를 골랐다면 빈 띠가 생기는 대신 모양이 같았다).
 *
 * **하한과 상한을 둔다.** 하한은 §8 `글자 최소`(12px)를 지키고, 상한은 세로가 아주 긴
 * 모니터에서 글자만 커져 칸을 밀어내는 것을 막는다.
 *
 * 값은 **1080을 기준으로 환산**했다 — 52px ÷ 1080 = 4.81vh 식이다. 그래서 1920×1080에서는
 * 지금까지의 화면과 **픽셀 단위로 같다.**
 *
 * **실제 `clamp()` 값은 `globals.css`의 `.wall-*` 클래스가 갖는다.** Tailwind의 arbitrary
 * 임의 속성 문법으로 CSS 변수를 넣으면 값이 `var(...)`로 잘못 생성돼 CSS 파싱을 깨뜨렸다(실제로
 * 밟았다). 여기는 그 클래스에 굵기·자간을 얹은 조합만 갖는다.
 */
export const WALL_VALUE_XL = 'wall-xl font-bold leading-none tracking-tight';
export const WALL_VALUE_LG = 'wall-lg font-bold leading-none tracking-tight';
export const WALL_VALUE_MD = 'wall-md font-bold leading-none tracking-tight';
/** 패널 제목. 레퍼런스의 머리줄 글자 크기다 */
export const WALL_TITLE = 'wall-title font-bold leading-tight tracking-tight text-fg';
/** 항목 이름 */
export const WALL_LABEL = 'wall-label font-semibold leading-tight text-fg';
/** 곁의 사실(단위·기준·시각). 이 화면의 **최소 글자**이며 §8 `글자 최소`(12px)를 넘는다 */
export const WALL_META = 'wall-meta leading-tight';
/** 큰 수에 붙는 단위(`m³`·`건`). 값과 함께 커져야 «붙어 있는 글자»로 읽힌다 */
export const WALL_UNIT = 'wall-unit font-medium text-fg-muted';
/** 값 곁의 등급 이름. 색만으로 말하지 않게 늘 함께 선다(**E2**) */
export const WALL_GRADE = 'wall-grade font-bold';
/** 설비 줄 끝의 등급. 한 줄 안이라 계기 곁의 것보다 한 단 낮다 */
export const WALL_GRADE_SM = 'wall-grade-sm font-bold leading-none';

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
 * 바닥 띠 추이선의 높이(px) — **상수로 두는 이유가 있다.**
 *
 * 선 그래프는 `preserveAspectRatio="none"`이라 **높이가 확정되지 않으면 viewBox의 비율로
 * 되돌아간다.** 폭이 1,000px을 넘는 칸에서 그 비율은 높이도 1,000px이 넘는다는 뜻이라,
 * `h-full`·`flex-1`로 두면 카드가 화면을 뚫고 나간다(첫 판본이 실제로 그랬다).
 *
 * 감싼 상자와 viewBox가 **같은 값을 봐야** 선이 세로로 늘어나거나 눌리지 않는다.
 */
export const WALL_SPARK_H = 150;

/**
 * 추이선이 **화면에서 실제로 차지하는 높이.**
 *
 * 위 `WALL_SPARK_H`는 **viewBox 좌표계**의 값이라 그대로 둔다 — `preserveAspectRatio="none"`
 * 이라 좌표계와 렌더 높이가 달라도 세로로 늘어나 채우고, 선 굵기는
 * `vectorEffect="non-scaling-stroke"`가 지켜 준다. 화면 높이에 매야 하는 것은 **바깥 상자**다.
 */
export const WALL_SPARK_CLASS = 'wall-spark-h';

/**
 * 추이선의 솎기 간격 — **표본 수가 아니라 분으로 적는다**(§8 `솎기`).
 *
 * 1,440점을 900px에 그리면 픽셀당 1.6점이라 선이 «털»이 된다. 수집 주기가 바뀌어도 이 값은
 * 같은 시간을 뜻한다 — 표본 수를 박아 두면 주기가 바뀔 때 구간이 조용히 늘거나 줄어든다
 * (`[INC-111]`).
 */
export const WALL_SPARK_BUCKET_MINUTES = 6;

/**
 * 바닥 띠 추이의 **가로 격자·세로 눈금 자리**(위에서부터의 비율).
 *
 * 셋이 아니라 둘인 이유 — 맨 아래(`0`)는 격자선이 아니라 **축선**이라 hairline이 맡고,
 * 라벨도 그 자리에 따로 선다. 파선 격자와 실선 축을 갈라 두면 «바닥이 0»이 눈에 먼저 든다.
 */
export const WALL_TREND_GRID_AT = [0, 0.5] as const;

/**
 * 가로축 눈금 간격(시간). 24시간 창에 **6개**가 서고 맨 끝의 «지금»이 하나 더 붙는다.
 *
 * 더 촘촘하면 1366×768에서 글자가 붙고, 더 성기면 «몇 시쯤»을 짚을 자리가 모자란다.
 */
export const WALL_TREND_TICK_HOURS = 4;

/**
 * 맨 끝 눈금과 이만큼(계열 길이의 비율) 안에 든 정시 눈금은 뺀다 — 글자가 겹친다.
 *
 * **표본 수가 아니라 비율이다** — 수집 주기가 바뀌어 표본 수가 달라져도 «화면에서 겹치는
 * 거리»는 그대로다(`[INC-111]`이 남긴 교훈의 같은 갈래다).
 *
 * `0.05`였다 — 1920×1080 캡처에서 `12:00`과 맨 끝이 **실제로 겹쳤다.** 라벨 반쪽(`HH:MM`)에
 * 맨 끝 라벨 한 장을 더한 폭이 좁은 화면에서 7%쯤이라 그만큼 띄운다.
 */
export const WALL_TREND_TICK_MIN_GAP = 0.07;

/** 계측 칸 안의 작은 추이선 높이(px). 바닥 띠의 추이(`WALL_SPARK_H`)보다 낮다 */
export const WALL_CELL_SPARK_H = 64;

/** 계측 칸 안 추이선의 실제 높이. 위 값은 viewBox 좌표계다 */
export const WALL_CELL_SPARK_CLASS = 'wall-cell-spark-h';

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
