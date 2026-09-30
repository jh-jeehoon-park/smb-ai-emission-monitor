import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';
import { VALUE_MD } from '@/shared/ui/type-scale';
import type { GridSection } from './water-quality-grid';
import styles from './water-quality-grid-skeleton.module.scss';

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
    <SkeletonRegion label="계측값을 받고 있습니다" className={styles.root}>
      <div className={styles.sections}>
        {sections.map((section) => (
          <section key={section.title ?? 'main'}>
            {section.title && (
              <p className={styles.sectionTitle}>{section.title}</p>
            )}
            <div className={styles.grid}>
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
    <div className={styles.card}>
      <span className={styles.symbol}>{symbol}</span>

      {/*
       * 값 — **막대를 실제 값과 같은 요소 안에 둔다.** 그 요소의 단(`VALUE_MD`)이 높이를
       * 정하고 `1em`이 그 글자 크기다. 픽셀을 박으면 단이 바뀔 때 한쪽만 남아 값이 도착할 때
       * 칸이 튄다 — 같은 화면의 타일에서 실제로 6px 어긋나 있었다.
       */}
      <p className={cn('num', styles.value, VALUE_MD)}>
        <Skeleton className={styles.valueBar} />
      </p>

      <p className={styles.label}>{label}</p>

      {/* 기준 문구 한 줄 */}
      <Skeleton className={styles.noteBar} />

      <Skeleton className={styles.sparkBar} />
    </div>
  );
}
