import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';
import type { GridSection } from './water-quality-grid';

/**
 * 계측 격자가 **아직 답을 모르는 동안** 그 자리를 지킨다 `[사용자 요청 2026-09-07]`.
 *
 * 한때 이 자리에 **내장 데이터가 그려졌다.** 첫 응답이 오기 전 `pending` 상태가 fixture를
 * 들고 있었기 때문이다 — 답이 아닐 수 있는 값이 답의 자리에 앉았고, 응답이 오면 카드
 * 여덟 장이 눈에 보이게 다시 그려졌다.
 *
 * **같은 짜임을 그린다.** 격자·묶음 제목·칸 수·칸 높이를 실제와 맞춘다 — 값이 도착할 때
 * 자리가 움직이지 않아야 «값만 채워졌다»로 읽힌다. 자리가 튀면 스켈레톤이 오히려 점프를
 * 하나 더 만든다.
 *
 * **기호와 항목 이름은 그린다.** 그것은 서버가 주는 값이 아니라 사전(`MEASUREMENT_ITEMS`)이
 * 아는 것이라 기다릴 이유가 없다 — 모르는 것(값·단위·기준 판정)만 면으로 덮는다.
 */
export function WaterQualityGridSkeleton({ sections }: { sections: GridSection[] }) {
  return (
    <SkeletonRegion label="계측값을 받고 있습니다" className="@container">
      <div className="space-y-3">
        {sections.map((section) => (
          <section key={section.title ?? 'main'}>
            {section.title && (
              <p className="mb-1.5 text-[12px] font-medium text-fg-subtle">{section.title}</p>
            )}
            <div className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4">
              {section.codes.map((code) => (
                <Card key={code} symbol={MEASUREMENT_ITEMS[code].symbol} label={MEASUREMENT_ITEMS[code].label} />
              ))}
              {/* 차 칸도 한 칸을 차지한다 — 빠뜨리면 값이 올 때 격자가 한 칸 밀린다 */}
              {section.diff && <Card symbol="Δ" label={section.diff.label} />}
            </div>
          </section>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/**
 * 칸 하나. **실제 카드와 같은 줄 구성**이다 — 기호 · 값 · 이름 · 기준 · 스파크라인.
 *
 * 값·기준 자리만 면으로 덮는다. 높이가 실제와 어긋나면 값이 도착할 때 격자가 튄다.
 */
function Card({ symbol, label }: { symbol: string; label: string }) {
  return (
    <div className="h-full rounded-nested bg-surface-2 p-3">
      <span className="text-[12px] font-medium tracking-[0.08em] text-fg-subtle">{symbol}</span>

      {/* 값 — `VALUE_MD`(18px)와 같은 높이로 덮는다 */}
      <Skeleton className="mt-1 h-[18px] w-14" />

      <p className="mt-0.5 truncate text-[12px] text-fg-muted">{label}</p>

      {/* 기준 문구 한 줄 */}
      <Skeleton className="mt-1 h-3 w-20" />

      {/* 스파크라인 — 실제와 같은 40px */}
      <Skeleton className="-mx-1 mt-2 h-10" />
    </div>
  );
}
