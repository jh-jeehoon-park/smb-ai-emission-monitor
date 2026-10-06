import { STORAGE_KEYS } from '@/shared/config/storage';

export const LIMIT_STORAGE_KEY = STORAGE_KEYS.dischargeLimits;
export const CLASSIFICATION_STORAGE_KEY = STORAGE_KEYS.siteClassification;

/**
 * 기준치가 없는 이유. **셋을 구분한다** — 무엇을 해야 하는지가 다르다.
 *
 * 예전에는 `unavailableReason` 하나로 "표가 없다"만 말했다. 사용자가 설정할 수 있게 된
 * 지금은 "**당신이** 무엇을 해야 하는가"가 달라진다 — 사업장 분류를 고르는 것과 기준치를
 * 입력하는 것은 다른 일이다.
 */
export const UNRESOLVED_REASONS = {
  /*
   * **누가 해야 하는지를 적는다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
   *
   * 한때 *"사업장 설정에서 고르면"* 이라고만 적었는데, 이 문구를 보는 세 역할 중 **둘은
   * 그 탭이 없다**(`사업장 규제정보`는 시스템 관리자 전용이다) — 지킬 수 없는 안내였다.
   *
   * 탭 이름을 「사업장 분류」로 적고 있었다 — 탭이 「사업장 규제정보」로 넓어진 뒤에도 이 문구만
   * 옛 이름이라 **없는 탭을 가리켰다** `[2026-09-29]`.
   */
  noClassification:
    '지역구분·배출량 규모가 설정되지 않아 기준치를 적용할 수 없습니다 — 시스템 관리자가 「사업장 규제정보」에서 먼저 골라야 합니다',
  /* 어느 탭인지 이름을 댄다 — «사업장 설정에서»는 지금 서 있는 화면 전체라 어디로 가라는 말이 아니었다 */
  noSheet:
    '이 지역구분·규모 조합의 기준치가 입력되지 않았습니다 — 「방류 기준치」에서 입력하면 초과를 판정합니다',
  noItem: '이 항목의 기준치가 입력되지 않았습니다',
} as const;

/*
 * **출처 문구 둘은 `entities/regulation`으로 옮겼다** `[사용자 요청 2026-09-28: 설정 재설계
 * 검토]` — `DEMO_LIMIT_SOURCE`·`userLimitSource`. 그 문자열은 이제 **규정의 근거 문구
 * (`citation`)** 이고, 규정이 entity에 살기 때문이다. 두 곳에 두면 한쪽만 바뀌어 같은 값이
 * 화면마다 다른 출처를 갖는다.
 */

/**
 * **처리수 재이용** `[사용자 결정 2026-09-29: 재이용 (가) — 사실로 받고 표시에 반영]`.
 *
 * 처리한 물 일부를 방류하지 않고 제조공정에 다시 쓰는 사업장이 있다 — 현장조사 대호특수강은
 * *"처리수 일부는 제조공정에 재이용"* 이라 적었고 발생·배출·재이용량을 따로 댔다
 * (`docs/analysis/demonstration-sites.md`). 그런 사업장은 **유입보다 유출이 늘 적다** — 그 차를
 * 모르고 읽으면 물이 어디론가 사라지는 것처럼 보인다.
 *
 * **전량 재이용은 여기 없다** — 방류하지 않으므로 적용되는 법이 갈리는 축이고, 「방류·처리 경로」가
 * 이미 갖는다(`FULL_REUSE`). 둘을 한 칸에 두면 같은 사실을 두 곳에서 고칠 수 있게 된다.
 */
export const REUSE_STATUSES = ['none', 'partial'] as const;
export type ReuseStatus = (typeof REUSE_STATUSES)[number];

export const REUSE_STATUS_LABELS: Record<ReuseStatus, string> = {
  none: '재이용 없음',
  partial: '일부 재이용',
};
