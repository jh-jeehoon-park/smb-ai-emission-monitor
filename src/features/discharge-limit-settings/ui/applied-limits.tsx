'use client';

import {
  LEGAL_CHECK_ITEMS,
  LIMIT_LABEL,
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  limitBasisOf,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import {
  TABLE_HEAD_CELL,
  TABLE_HEAD_ROW,
  TABLE_ROOT,
  TABLE_ROW,
  TABLE_SCROLL,
} from '@/shared/ui/table';
import { useDischargeLimits } from '../model/use-discharge-limits';

/** 이 표를 담는 패널의 제목 옆 툴팁에 쓴다 — 값과 같은 파일에 있어야 함께 고쳐진다 */
export const APPLIED_LIMIT_NOTE = (
  <>
    <strong className="text-fg">지금 이 사업장에 적용되는 기준</strong>입니다. 여기서 고치지
    않습니다 — 값은 <strong className="text-fg">사업장 분류와 입력된 기준표</strong>에서 계산되며,
    바뀌면 이 표가 따라옵니다.
  </>
);

/**
 * **적용 기준은 고치는 값이 아니라 «나온» 값이다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 한때 세 역할이 **같은 기준치 표를 직접 편집**했다. 저장소는 `(지역구분 × 규모 × 항목)`
 * 한 벌이고 쓰는 쪽은 통째로 덮어쓰므로, 마지막에 저장한 역할이 이긴다 — 그리고 그 값은
 * **같은 분류의 모든 사업장**에 함께 적용된다(실측: `S-02`에 넣은 값이 `S-03`에도 적용됐다).
 *
 * 규제 기준에 «마지막에 쓴 쪽이 이긴다»를 두지 않는다. 입력은 한 주체가 맡고, 나머지는
 * **적용 결과와 그 출처**를 본다.
 *
 * **권한을 내린 것이 아니다** — 탭은 그대로 보이고, 보는 내용이 «입력 칸»에서 «적용 결과»로
 * 바뀌었다. 한때 사업장·기초지자체가 입력할 수 있었으나 그 값은 시스템 관리자가 사업장
 * 분류를 고르기 전까지 **어디에도 적용되지 않았다**(실측) — 고칠 수 있다는 표시만 있었다.
 */
export function AppliedLimits() {
  const { table, unresolvedReason, classification } = useDischargeLimits();

  return (
    <div className="space-y-3">
      {unresolvedReason ? (
        <p className="rounded-nested border border-border bg-surface-2 px-3 py-3 text-[12px] leading-relaxed text-fg-muted">
          {unresolvedReason}
        </p>
      ) : null}

      <div className={TABLE_SCROLL}>
        <table className={`${TABLE_ROOT} min-w-[460px] text-[12px]`}>
          <caption className="sr-only">
            이 사업장에 적용되는 방류 기준치. 지역구분 {classification.regionGrade ?? '미설정'} ·
            배출량 규모 {classification.dischargeScale ?? '미설정'} 기준으로 계산된 값이다.
          </caption>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th scope="col" className={TABLE_HEAD_CELL}>
                항목
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                적용 기준
              </th>
              <th scope="col" className={TABLE_HEAD_CELL}>
                출처
              </th>
            </tr>
          </thead>
          <tbody>
            {LEGAL_CHECK_ITEMS.map((item) => {
              const limit = item.code ? table[item.code] : undefined;
              const basis = item.code ? limitBasisOf(item.code, table) : 'none';
              const range = limit
                ? formatLimitRange(limit, MEASUREMENT_ITEMS[item.code!].decimals)
                : null;

              return (
                <tr key={item.label} className={TABLE_ROW}>
                  <th scope="row" className="px-3 py-3 text-left font-normal text-fg">
                    {item.label}
                  </th>
                  <td className="px-3 py-3">
                    {range === null || basis === 'none' ? (
                      <span className="text-fg-subtle">{UNRESOLVED_LIMIT_TEXT}</span>
                    ) : (
                      <span className="num text-fg">
                        {LIMIT_LABEL[basis]} {range}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-fg-muted">
                    {/*
                     * **SS는 기준을 넣어도 비교할 값이 없다** — 우리 계측에도 AI 추정에도
                     * 없어서(`[공정자료 p.5·19]`) `code`가 `null`이다. 5항목을 그대로 적고
                     * 보유 여부를 따로 표시한다는 원칙 그대로다.
                     */}
                    {item.code === null ? '계측 없음 — 이 시스템이 측정하지 않는 항목' : (limit?.source ?? '—')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
