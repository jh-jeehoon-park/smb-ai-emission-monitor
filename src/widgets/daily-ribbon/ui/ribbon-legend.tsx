import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { RIBBON_FILL, RIBBON_LEGEND } from '../config/constants';

/**
 * 리본 발치의 범례.
 *
 * **스켈레톤도 이것을 그린다** `[사용자 지적 2026-09-07]`. 범례는 계측이 아니라 상수에서 와
 * 기다릴 이유가 없고, 빼 두면 값이 도착할 때 카드가 이 줄만큼(약 33px) **늘어난다** —
 * 스켈레톤이 없애려던 점프를 스켈레톤이 만든다. 두 곳에서 각자 그리면 한쪽만 낡으므로
 * 부품 하나로 둔다.
 */
export function RibbonLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-2">
      <ul className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        {RIBBON_LEGEND.map((item) => (
          <li key={item.state} className="flex items-center gap-1 text-[12px] text-fg-subtle">
            <span
              aria-hidden
              className="inline-block h-2 w-3 rounded-[2px]"
              style={{
                backgroundColor: RIBBON_FILL[item.state],
                opacity: item.state === 'unknown' ? 0.45 : 1,
              }}
            />
            {item.label}
          </li>
        ))}
      </ul>
      {/* 좁아지면 눌러 담지 말고 줄을 바꾼다 — 구간 숫자는 줄어들면 못 읽는다 */}
      <AnomalyBandLegend className="shrink-0" />
    </div>
  );
}
