import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { STORAGE_KEYS } from '@/shared/config/storage';

export const SITE_PROCESS_STORAGE_KEY = STORAGE_KEYS.siteProcess;

/** 옛 저장 키 — 표준 단계 켜고 끄기. 처음 읽을 때 새 모양으로 옮긴다 */
export const LEGACY_PROCESS_STAGES_STORAGE_KEY = STORAGE_KEYS.processStages;

/**
 * 단계에 계측 지점이 하나도 없을 때 화면이 적는 말.
 *
 * **빈 칸으로 두지 않는다.** 어느 단계에서 무엇을 재는지는 사업장마다 ECP 채널을 걸어 정한다
 * `[사용자 결정 2026-09-29]` — 비워 두면 "재지 않는 단계"로 읽히고, 지어내면 없는 계측을
 * 주장한다. 무엇을 해야 하는지를 적는다.
 */
export const NO_STAGE_CODES_REASON =
  '이 단계에 계측 지점이 없습니다 — 사업장 설정 > 공정 구성에서 ECP 채널을 걸면 값을 표시합니다';

/**
 * 계측 지점에 걸 수 있는 **항목** — 채널이 «무엇을 재는가».
 *
 * 진동은 뺀다: 단위가 정해지지 않았고(`[TBD-49]`) 서버 채널도 없다. 나머지는 항목 사전 그대로다 —
 * 목록을 손으로 적으면 사전에 항목이 늘 때 이 선택지만 뒤처진다.
 */
export const EXCLUDED_CHANNEL_ITEMS = ['vibration'] as const;

export const CHANNEL_ITEM_OPTIONS = (Object.keys(MEASUREMENT_ITEMS) as MeasurementItemCode[]).filter(
  (code) => !(EXCLUDED_CHANNEL_ITEMS as readonly string[]).includes(code),
);

/**
 * 채널 목록을 어디서 얻었는가. **서버가 답하지 않으면 알려진 목록으로 메운다** — 그 사실을
 * 적지 않으면 실제 장치에 없는 채널을 «받는 중»으로 읽는다.
 */
export const CHANNEL_SOURCE_LABELS = {
  server: '서버에서 받음',
  pending: '서버 확인 중 · 알려진 목록',
  fallback: '서버 미응답 · 알려진 목록',
} as const;

/**
 * 계측 지점 하나의 상태 — **셋을 가른다.** 한 말로 뭉치면 «값이 없다»의 이유가 사라진다.
 * - 읽는 중: 채널이 있고 화면이 지금 그 값을 받는다
 * - 수신 연결 전: 채널 이름은 걸었지만 화면이 아직 그 채널을 받지 않는다(유입 수질 8종 · 새 채널)
 * - 채널 미지정: 지점은 정했지만 ECP 채널이 없다
 */
export const CHANNEL_STATE_LABELS = {
  reading: '읽는 중',
  notWired: '수신 연결 전',
  noChannel: '채널 미지정',
} as const;

/**
 * 채널 하나가 갈 곳 — «어느 단계의 값인가» 선택의 단계 밖 두 칸.
 * `정하지 않음`은 아직 답하지 않은 것, `사용 안 함`은 쓰지 않기로 정한 것이다. 둘을 가르지 않으면
 * 새로 들어온 채널이 «안 쓰기로 한 채널» 사이에 묻힌다.
 */
export const CHANNEL_TARGET_LABELS = {
  unassigned: '정하지 않음',
  unused: '사용 안 함',
} as const;

/** 채널 연결 표 «상태» 칸 — 단계에 걸린 줄은 `CHANNEL_STATE_LABELS`를 쓴다 */
export const CHANNEL_ROW_STATUS_LABELS = {
  unassigned: '정하기 전',
  unused: '—',
} as const;
