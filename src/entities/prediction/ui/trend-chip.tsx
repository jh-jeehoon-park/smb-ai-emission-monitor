import { cn } from '@/shared/lib/cn';
import { TREND_VISUAL } from '../config/trend-visual';
import { TREND_LABELS, type Trend } from '../model/types';

/**
 * 경향 칩 — 상승·유지·하락.
 *
 * **색 + 라벨 + 형태 셋을 함께 낸다**(`design-system §2` 마지막 줄). 예전에는 배경 없는
 * 12px 맨 텍스트였고 **하락과 유지가 같은 색**이어서 방향이 읽히지 않았다
 * `[사용자 요청 2026-08-21]`.
 *
 * 세 화면(오염도 추정 · 통합 관제 · 리포트)이 같은 로직을 각자 갖고 있었다. 한 곳으로
 * 모아 두면 색·글리프가 갈리지 않는다.
 *
 * **`trend`가 `null`이면 아무것도 그리지 않는다.** 통신이 두절되면 기울기를 낼 표본이
 * 없다 — 화살표를 찍으면 없는 방향을 주장한다(E4).
 *
 * `bare`는 표 안에서 쓴다. 행마다 배경 칩이 들어가면 표가 시끄러워지는데, 글리프가 남으니
 * 색만으로 가르지 않는다는 규칙은 그대로 지켜진다.
 */
export function TrendChip({
  trend,
  bare,
  className,
}: {
  trend: Trend | null;
  bare?: boolean;
  className?: string;
}) {
  if (trend === null) return null;

  const visual = TREND_VISUAL[trend];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[11px]',
        visual.text,
        /* 표에서는 배경·테두리를 뺀다. 글자색과 글리프는 그대로 남는다 */
        !bare && cn('rounded-[3px] border px-1.5 py-0.5', visual.chip),
        className,
      )}
    >
      {/* 형태는 보조 부호다. 라벨이 바로 옆에 있어 보조기술에는 숨긴다 */}
      <span aria-hidden className="leading-none">
        {visual.glyph}
      </span>
      {TREND_LABELS[trend]}
    </span>
  );
}
