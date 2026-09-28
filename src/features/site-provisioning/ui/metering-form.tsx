'use client';

import { Checkbox } from '@/shared/ui/checkbox';
import { useMetering } from '../model/use-metering';
import { useProvisioningStore } from '../model/provisioning-context';

/** 그 사업장의 설비 — 목록은 화면이 넘긴다(이 feature는 설비 도메인을 모른다) */
export interface MeterableUnit {
  id: string;
  name: string;
}

/**
 * 어느 설비의 **전력을 잴 것인가** (SCR-OP-010)
 * `[사용자 요청 2026-09-21: 전력계측기를 통한 각 설비별 전력 사용량]`.
 *
 * **현장조사가 이 결정을 우리 몫으로 명시했다** — *"전체 전력 또는 설비별 전력 중 실제
 * 수집범위는 JH솔루션 검토 후 확정이 필요함"*(에버) · *"JH솔루션에서 AI 분석 목적에 필요한
 * 공정·설비를 선정한 후"*(대호특수강). 다섯 곳 모두 기존 전력량계가 통신 불가이거나
 * 미확인이라, 여기서 켠 것이 곧 **통신형 계기를 달 대상**이 된다.
 *
 * **설비 목록은 고치지 않는다.** 대수는 현장이 알려 주는 사실이고(에버 8 · 칠갑 12), 게다가
 * 알람이 모듈 로드 시점에 설비 목록으로 만들어져 있어 여기서 바꾸면 **없는 설비의 알람이
 * 남는다.** 이 폼이 정하는 것은 그 목록 위의 **계측 여부** 하나다.
 */
export function MeteringForm({ siteId, units }: { siteId: string; units: MeterableUnit[] }) {
  const { setMeteredEquipment, reset } = useProvisioningStore();
  const { ids, isUserSet, isMetered } = useMetering();

  const setOn = (id: string, next: boolean) =>
    setMeteredEquipment(siteId, next ? [...ids, id] : ids.filter((x) => x !== id));

  if (units.length === 0) {
    return <p className="text-[12px] text-fg-subtle">이 사업장의 설비 목록이 아직 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {units.map((unit) => {
          const on = isMetered(unit.id);
          return (
            <li key={unit.id} className="rounded-nested border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fg">
                  <Checkbox
                    size="sm"
                    checked={on}
                    onChange={(event) => setOn(unit.id, event.target.checked)}
                  />
                  {unit.name}
                </label>
                {/*
                 * 켠 것에만 결과를 적는다 — 끈 줄까지 「미계측」을 달면 대부분이 같은 말을
                 * 반복해 정작 고른 것이 눈에 띄지 않는다.
                 */}
                <span className="text-[12px] text-fg-subtle">
                  {on ? '통신형 전력량계 설치 대상' : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        * 되돌릴 것이 없으면 줄 자체를 그리지 않는다 — 빈 가로선만 남는다(공정·계측 폼의 선례).
        *
        * **좁은 화면에서만 40px을 채운다**(`min-h-10 lg:min-h-0`) — 글자 12px + `py-1`이면
        * 실높이가 28px이라 손가락 최소를 밑돈다. `lg` 이상은 한 픽셀도 달라지지 않는다.
        */}
      {isUserSet && (
        <div className="flex justify-end border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => reset(siteId)}
            className="inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-[3px] border border-border px-2 py-1 text-[12px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:text-fg lg:min-h-0"
          >
            선정 전으로 되돌리기
          </button>
        </div>
      )}
    </div>
  );
}
