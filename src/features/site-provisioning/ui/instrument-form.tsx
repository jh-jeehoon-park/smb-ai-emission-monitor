'use client';

import { MEASUREMENT_ITEMS, WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { Checkbox } from '@/shared/ui/checkbox';
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
 * 체크를 푸는 것은 «보여 주지 마라»가 아니라 «이 사업장에는 그 장비가 없다»는 사실 입력이다.
 */
export function InstrumentForm({ siteId }: { siteId: string }) {
  const { setAbsentCodes, reset } = useProvisioningStore();
  const { absent, isUserSet, has } = useInstruments();

  /**
   * **체크박스가 주는 것은 «다음 상태»다.** 현재 상태를 넘기면 뒤집혀 — 보유한 항목을 끄려고
   * 눌러도 그대로 보유로 남는다(브라우저에서 그렇게 한 번 깨뜨렸다).
   */
  const setHeld = (code: (typeof WATER_QUALITY_CODES)[number], nextHeld: boolean) =>
    setAbsentCodes(siteId, nextHeld ? absent.filter((c) => c !== code) : [...absent, code]);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {WATER_QUALITY_CODES.map((code) => {
          const item = MEASUREMENT_ITEMS[code];
          const held = has(code);

          return (
            <li key={code} className="rounded-nested border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fg">
                  <Checkbox
                    size="sm"
                    checked={held}
                    onChange={(event) => setHeld(code, event.target.checked)}
                  />
                  <span className="num font-semibold">{item.symbol}</span>
                  {item.label}
                </label>
                {/*
                 * 끈 항목에만 결과를 적는다 — 켜진 항목에 「설치됨」을 달면 여덟 줄이 같은 말을
                 * 반복해 정작 다른 한 줄이 눈에 띄지 않는다.
                 */}
                <span className="text-[12px] text-fg-subtle">
                  {held ? item.unitKo || item.unit : '미설치 — 화면에 값 대신 그렇게 적습니다'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        * 되돌릴 것이 없으면 줄 자체를 그리지 않는다 — 빈 가로선만 남는다(공정 폼의 선례).
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
            전부 보유로 되돌리기
          </button>
        </div>
      )}
    </div>
  );
}
