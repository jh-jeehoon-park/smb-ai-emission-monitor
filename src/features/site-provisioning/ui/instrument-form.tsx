'use client';

import { RotateCcw } from 'lucide-react';
import { MEASUREMENT_ITEMS, WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { ToggleCard } from '@/shared/ui/toggle-card';
import { useInstruments } from '../model/use-instruments';
import { useProvisioningStore } from '../model/provisioning-context';

/**
 * 사업장이 **어떤 계측기를 달았는지** 고른다 (SCR-OP-010).
 *
 * 실증 현장조사가 사업장마다 항목이 갈리는 것을 보여 줬다 — 공통 7종에 TN·TP가 곳에 따라
 * 붙고, 다섯 곳 모두 색도가 없다 `[TBD-61]`. 우리가 어느 쪽인지 정할 수 없으므로 받는다
 * (`[TBD-45]` 기준치를 사용자 설정으로 받은 것과 같은 길이다).
 *
 * **끈 항목을 화면에서 지우지 않는다**(**A2**) — 자리를 지킨 채 「미설치」로 적는다. 여기서
 * 끄는 것은 «보여 주지 마라»가 아니라 «이 사업장에는 그 장비가 없다»는 사실 입력이다.
 *
 * **여덟 항목을 카드 격자로 세운다** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`. 한 줄씩
 * 카드 폭을 채우던 판본은 이름이 왼쪽 끝, 단위가 오른쪽 끝이라 어느 단위가 어느 줄 것인지 눈으로
 * 따라가야 했다.
 */
export function InstrumentForm({ siteId }: { siteId: string }) {
  const { setAbsentCodes, reset } = useProvisioningStore();
  const { absent, isUserSet, has } = useInstruments();

  /**
   * **스위치가 주는 것은 «다음 상태»다.** 현재 상태를 넘기면 뒤집혀 — 보유한 항목을 끄려고
   * 눌러도 그대로 보유로 남는다(브라우저에서 그렇게 한 번 깨뜨렸다).
   */
  const setHeld = (code: (typeof WATER_QUALITY_CODES)[number], nextHeld: boolean) =>
    setAbsentCodes(siteId, nextHeld ? absent.filter((c) => c !== code) : [...absent, code]);

  return (
    <div className="space-y-4">
      <div className="@container">
        <ul className="grid gap-2 @[34rem]:grid-cols-2 @[56rem]:grid-cols-3">
          {WATER_QUALITY_CODES.map((code) => {
            const item = MEASUREMENT_ITEMS[code];
            return (
              <li key={code}>
                <ToggleCard
                  checked={has(code)}
                  onChange={(next) => setHeld(code, next)}
                  mark={item.symbol}
                  title={item.label}
                  meta={item.unitKo || item.unit}
                  /*
                   * 끈 항목에만 결과를 적는다 — 켜진 항목에 「설치됨」을 달면 여덟 장이 같은 말을
                   * 반복해 정작 다른 한 장이 눈에 띄지 않는다.
                   */
                  offNote="미설치 — 화면에 값 대신 그렇게 적습니다"
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        * 되돌릴 것이 없으면 줄 자체를 그리지 않는다 — 빈 가로선만 남는다(공정 폼의 선례).
        * 공용 조작 버튼을 쓴다 — 좁은 화면 40px 규약이 그 껍데기에 들어 있다.
        */}
      {isUserSet && (
        <div className="flex justify-end">
          <button type="button" onClick={() => reset(siteId)} className={ACTION_BUTTON_QUIET}>
            <RotateCcw aria-hidden className="size-3.5" strokeWidth={2} />
            전부 보유로 되돌리기
          </button>
        </div>
      )}
    </div>
  );
}
