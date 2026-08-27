import { PROVINCE_SHAPES, PROVINCE_VIEWBOX } from '@/shared/config/korea-provinces';
import { projectToMap } from '@/shared/lib/geo';
import type { Site } from '@/entities/site';

/** 표시 지름(뷰박스 단위). 인셋이 작아 화면에서는 3~4px이 된다 */
const MARK_RADIUS = 9;
/** 표시를 감싸는 고리. 점만 두면 도형 선과 섞여 어느 것이 표시인지 알 수 없다 */
const MARK_RING_RADIUS = 17;

/**
 * **관할이 전국 어디인지 알려 주는 작은 지도.**
 *
 * 본지도가 시도 한 장이라 **그 시도가 전국 어디인지**는 여전히 알 수 없다 — 기초지자체는
 * 통합 관제에 들어갈 수 없어(`SCREEN_ROLES`) 전국 지도를 볼 데가 이 화면뿐이다.
 *
 * **어느 면도 칠하지 않는다.** 전국을 중립색 윤곽으로만 두고 관할 위치에 **표시 하나**만
 * 얹는다 — 면을 칠하면 그 면이 관할로 읽힌다.
 *
 * **각지지 않는다.** 시도 도형은 0.8px로 단순화돼 확대하면 각지는데, 인셋은 오히려 줄여
 * 그린다(≈90px). 각지는 것은 키울 때만 생긴다.
 */
export function LocatorInset({ municipality, sites }: { municipality: string; sites: Site[] }) {
  const first = sites[0];
  if (!first) return null;

  /* 관할 위치는 사업장 좌표에서 잡는다 — 별도 매핑을 두면 지도와 두 곳이 갈릴 수 있다 */
  const { x, y } = projectToMap(first.coordinates[0], first.coordinates[1]);

  return (
    <figure className="flex shrink-0 items-center gap-3 border-t border-border pt-2.5">
      <svg
        viewBox={`${PROVINCE_VIEWBOX.x} ${PROVINCE_VIEWBOX.y} ${PROVINCE_VIEWBOX.width} ${PROVINCE_VIEWBOX.height}`}
        className="h-[74px] w-auto shrink-0"
        aria-hidden
      >
        {PROVINCE_SHAPES.map((province) => (
          <path
            key={province.name}
            d={province.d}
            fill="var(--surface-2)"
            stroke="var(--border)"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        ))}
        <circle
          cx={x}
          cy={y}
          r={MARK_RING_RADIUS}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4}
          opacity={0.35}
        />
        <circle cx={x} cy={y} r={MARK_RADIUS} fill="var(--accent)" />
      </svg>
      <figcaption className="min-w-0 text-[12px] leading-relaxed text-fg-subtle">
        <span className="block font-medium text-fg-muted">전국에서의 위치</span>
        {first.province} {municipality}
      </figcaption>
    </figure>
  );
}
