'use client';

import { RotateCcw, Zap } from 'lucide-react';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { ToggleCard } from '@/shared/ui/toggle-card';
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

  /*
   * **설비를 카드 격자로 세운다** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]` — 계측 구성과
   * 같은 부품이되 **끈 것의 뜻이 반대다**: 여기서 끈 것은 «없다»가 아니라 «고르지 않았다»라
   * 흐리게 두지 않는다(`offMeaning="selection"`). 대부분이 꺼져 있는 자리라 흐리면 목록 전체가
   * 죽어 보인다.
   */
  return (
    <div className="space-y-4">
      <div className="@container">
        <ul className="grid gap-2 @[34rem]:grid-cols-2 @[56rem]:grid-cols-3">
          {units.map((unit) => (
            <li key={unit.id}>
              <ToggleCard
                checked={isMetered(unit.id)}
                onChange={(next) => setOn(unit.id, next)}
                mark={<Zap className="size-4" strokeWidth={1.8} />}
                title={unit.name}
                meta={unit.id}
                offMeaning="selection"
                /*
                 * 켠 것에만 결과를 적는다 — 끈 줄까지 「미계측」을 달면 대부분이 같은 말을
                 * 반복해 정작 고른 것이 눈에 띄지 않는다.
                 */
                onNote="통신형 전력량계 설치 대상"
              />
            </li>
          ))}
        </ul>
      </div>

      {/* 되돌릴 것이 없으면 줄 자체를 그리지 않는다. 공용 조작 버튼이 좁은 화면 40px을 채운다 */}
      {isUserSet && (
        <div className="flex justify-end">
          <button type="button" onClick={() => reset(siteId)} className={ACTION_BUTTON_QUIET}>
            <RotateCcw aria-hidden className="size-3.5" strokeWidth={2} />
            선정 전으로 되돌리기
          </button>
        </div>
      )}
    </div>
  );
}
