'use client';

import { MEASUREMENT_ITEMS, WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { EQUIPMENT_CODES, type MeasurementItemCode } from '@/shared/config/measurement';
import { ALL_PROCESS_STAGES } from '@/entities/process';
import { useProcessSettingsStore } from '../model/process-settings-context';
import { useProcess } from '../model/use-process';

/** 단계마다 고를 수 있는 항목 — 수질 8종 + 설비 3종. 진동은 계열이 아니라 제외한다 */
const SELECTABLE: readonly MeasurementItemCode[] = [...WATER_QUALITY_CODES, ...EQUIPMENT_CODES];

/**
 * 사업장의 공정 구성을 고른다 (SCR-OP-010).
 *
 * 회의가 방식을 정했다 — 최대 공정을 두고 필요한 단계만 켠다 `[회의 2026-08-20]`.
 * 여기서 켠 것이 공정도·단계 상세에 그대로 반영된다.
 *
 * **계측 항목의 기본값을 채우지 않는다.** 어느 단계에서 무엇을 재는지가 원문에도 회의에도
 * 없다 `[TBD-53]` — 우리가 골라 두면 없는 계측을 주장하게 된다. 빈 상태가 정직한 출발점이다.
 */
export function ProcessStageForm({ siteId }: { siteId: string }) {
  const { setStage, reset } = useProcessSettingsStore();
  const { stages, isUserSet } = useProcess();

  /* 켜진 단계를 빠르게 찾기 위한 색인. 배열을 매번 훑으면 단계마다 전체를 다시 본다 */
  const enabled = new Map(stages.map((s) => [s.stage.id, s.codes]));

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {ALL_PROCESS_STAGES.map((stage) => {
          const codes = enabled.get(stage.id);
          const on = codes !== undefined;

          return (
            <li key={stage.id} className="rounded-[4px] border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fg">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(event) =>
                      setStage(siteId, stage.id, {
                        enabled: event.target.checked,
                        codes: codes ?? [],
                      })
                    }
                    className="size-3.5 cursor-pointer accent-[var(--actual)]"
                  />
                  <span className="num text-fg-subtle">{stage.order}</span>
                  {stage.name}
                </label>
                <span className="text-[11px] text-fg-subtle">
                  {stage.optional ? '플러스 알파' : '표준 공정'} · {stage.units.join(' · ')}
                </span>
              </div>

              {/* 끈 단계의 항목을 보여 주지 않는다 — 고를 수 없는 것을 띄우면 조작처럼 보인다 */}
              {on && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                  {SELECTABLE.map((code) => {
                    const picked = codes.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={picked}
                        onClick={() =>
                          setStage(siteId, stage.id, {
                            enabled: true,
                            codes: picked
                              ? codes.filter((c) => c !== code)
                              : [...codes, code],
                          })
                        }
                        className={
                          picked
                            ? 'cursor-pointer rounded-[3px] border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg'
                            : 'cursor-pointer rounded-[3px] border border-border px-1.5 py-0.5 text-[11px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:text-fg'
                        }
                      >
                        {MEASUREMENT_ITEMS[code].symbol}
                      </button>
                    );
                  })}
                  {codes.length === 0 && (
                    <span className="text-[11px] text-fg-subtle">
                      항목을 고르지 않으면 계측 지점이 아닙니다
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
        <p className="max-w-[68ch] text-[11px] leading-relaxed text-fg-subtle">
          단계별 계측 항목은 원문에 없습니다 [TBD-53]. 프로브를 각 공정에 부착한다는 것까지가
          회의 결과이고 [회의 2026-08-20], 어느 단계에서 무엇을 재는지는 여기서 정합니다.
        </p>
        {/* 설정한 적이 없으면 되돌릴 것이 없다 — 누를 수 있는 빈 버튼을 두지 않는다 */}
        {isUserSet && (
          <button
            type="button"
            onClick={() => reset(siteId)}
            className="shrink-0 cursor-pointer rounded-[3px] border border-border px-2 py-1 text-[11px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:text-fg"
          >
            표준 공정으로 되돌리기
          </button>
        )}
      </div>
    </div>
  );
}
