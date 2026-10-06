import { AI_HEX, MISSING_HEX } from '@/shared/config/status-visual';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';

/**
 * 차트 발치의 범례.
 *
 * **상태 띠 셋이 걷히면서 설명할 것도 바뀌었다** `[사용자 요청 2026-09-08]`. 앞선 판본은
 * `가동·방류 중`·`정지·중단`·`수신 없음` 셋을 적었는데 그 줄들이 없어졌다. 지금 이 그림에
 * 있는 것은 **계열 하나 · 결측 · 구간 넷**이다.
 *
 * `dataviz` — *"a single series needs no legend box; the title names it"*. 그래도 계열 항목을
 * 두는 이유는 이 선이 **AI 산출값**이라는 것이 색만으로는 전달되지 않기 때문이다(**E3**) —
 * 같은 화면의 계측 격자는 실측 계열색을 쓰고, 두 파랑을 구분하는 것은 이 라벨뿐이다.
 */
export function RibbonLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-2">
      <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <li className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
          {/* 선 계열이라 스와치도 선이다 — 면으로 보이면 이 계열이 면인 줄 알게 된다 */}
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ backgroundColor: AI_HEX }}
          />
          이상 점수 (AI 산출)
        </li>

        <li aria-hidden className="h-3 w-px shrink-0 bg-border" />

        <li className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
          {/*
           * **결측은 빗금이다**(`screens.md` §8 `결측`). 차트에 깔린 것과 같은 45도 질감을
           * 축소해 보인다 — 범례가 그림과 다른 표기를 쓰면 범례가 거짓이 된다.
           */}
          <span
            aria-hidden
            className="inline-block h-2.5 w-4 rounded-[2px]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${MISSING_HEX} 0 2px, transparent 2px 5px)`,
            }}
          />
          수신 없음
        </li>
      </ul>

      {/* 좁아지면 눌러 담지 말고 줄을 바꾼다 — 구간 숫자는 줄어들면 못 읽는다 */}
      <AnomalyBandLegend className="shrink-0" />
    </div>
  );
}
