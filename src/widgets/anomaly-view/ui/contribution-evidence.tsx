import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { PROVISIONAL_DISPLAY_DECIMALS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatValue } from '@/shared/lib/format';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { MeterBar } from '@/shared/ui/meter-bar';
import type { ContributionEvidence } from '../lib/distribution';

/**
 * 기여 변수 — **모델이 낸 것과 계측이 낸 것을 나란히** `[사용자 요청 2026-09-08]`.
 *
 * 통합 관제의 `AnomalyPanel`은 `TOC 34%` 막대만 그린다. 그것만으로는 «그래서 그 값이
 * 이상했나»를 알 수 없다 — 이 화면은 조사 화면이라 **근거**를 함께 내야 한다.
 *
 * **기여도는 손대지 않는다.** 모델 산출이고 우리에게 모델이 없다 `[TBD-32]`. 오른쪽 칸이
 * 같은 시각의 실측과 **조회 구간 분포에서의 자리**를 적는다(**E3**) — 둘이 어긋나면 어긋난
 * 대로가 정보다. 모델이 TOC를 지목했는데 TOC가 평소 자리라면 그것이 곧 검증 결과다.
 *
 * **`상위 8%`는 초과 판정이 아니다.** 배출허용기준은 지역·규모로 갈려 우리가 정하지 않는다
 * `[TBD-45]` — 이 값은 관측된 분포 안에서의 자리일 뿐이라 등급색을 쓰지 않는다.
 */
export function ContributionEvidenceList({
  rows,
  level,
  atLabel,
}: {
  rows: ContributionEvidence[];
  /** 기여도 막대의 색. 이 화면 범례(정상·주의·경고·위험)에 있는 색만 쓴다(§8 `막대·게이지`) */
  level: StatusLevel;
  /** 어느 시각의 계측인가. 되감은 시각이므로 «지금»이 아니다(**E3**) */
  atLabel: string;
}) {
  const visual = STATUS_VISUAL[level];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Eyebrow>주요 기여 변수 · XAI</Eyebrow>
        {/*
         * **«이 구간 등급의»라 적는다.** 기여 변수는 점수 밴드로 갈려 78과 91이 같은 다섯 행을
         * 낸다 — 구간을 바꿔도 안 바뀌는 것이 이 값의 성질이라 그것을 숨기지 않는다.
         */}
        <p className="text-[12px] text-fg-subtle">
          모델 산출 · <span className="text-fg-muted">{atLabel}</span> 계측
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map(({ contribution, value, distribution, percentile }) => {
          const Arrow = contribution.direction === 'up' ? TrendingUp : TrendingDown;
          const item = MEASUREMENT_ITEMS[contribution.code];

          return (
            <li key={contribution.code} className="grid gap-x-4 gap-y-1.5 @[30rem]:grid-cols-2">
              {/* 왼쪽 — 모델이 낸 것 */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-fg-muted">
                    {/* 방향은 화살표 모양이 나르고 색은 등급 하나뿐이다 `[사용자 지적 2026-08-31]` */}
                    <Arrow
                      aria-hidden
                      size={13}
                      strokeWidth={2.2}
                      className="shrink-0"
                      style={{ color: statusInk(visual) }}
                    />
                    <span className="sr-only">
                      {contribution.direction === 'up' ? '상승' : '하강'} 기여
                    </span>
                    <span className="truncate">{contribution.label}</span>
                  </span>
                  <span className="num shrink-0 text-[12px] font-semibold text-fg">
                    {(contribution.weight * 100).toFixed(
                      PROVISIONAL_DISPLAY_DECIMALS.contributionPercent,
                    )}
                    %
                  </span>
                </div>
                <MeterBar percent={contribution.weight * 100} color={visual.hex} />
              </div>

              {/* 오른쪽 — 계측이 낸 것 */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="num font-semibold text-fg">
                    {value === null ? '수신 없음' : formatValue(contribution.code, value)}
                    {value !== null && item.unit && (
                      <span className="ml-1 font-normal text-fg-subtle">{item.unit}</span>
                    )}
                  </span>
                  <span className="num shrink-0 text-fg-subtle">{rankLabel(percentile)}</span>
                </div>
                <DistributionTrack distribution={distribution} value={value} code={contribution.code} />
              </div>
            </li>
          );
        })}
      </ul>

      {/*
       * **이 마크가 무엇인지 한 번 적는다.** 계열 범례가 아니라 **마크 해설**이다 — 이 형태가
       * 저장소에 처음이라 없으면 상자와 점이 무엇인지 알 수 없다(§8 `그래프` — 범례는 그래프 아래).
       */}
      <p className="mt-3 border-t border-border pt-2 text-[12px] leading-relaxed text-fg-subtle">
        가로 트랙은 <strong className="text-fg-muted">조회 구간의 관측 범위</strong>, 가운데 상자는
        중앙 50%(사분위), 세로선은 중앙값입니다. 점은 <strong className="text-fg-muted">그 시각의
        실측값</strong>입니다 — 백분위는 관측 분포 안에서의 자리이지 기준 초과 판정이 아닙니다
        [TBD-45].
      </p>
    </div>
  );
}

/**
 * 분포 위 위치 마커 — **불릿 차트**다. 한 값을 참조 범위에 견주는 형태로, 항목마다 단위·범위가
 * 달라 **행마다 자기 축**을 갖는다(작은 다중 차트).
 *
 * 색은 하나뿐이다 — 점이 실측이라 `--actual`이고(§8 `그래프 색`), 트랙·상자·중앙선은 **데이터가
 * 아니라 참조 맥락**이라 중립 회색이다. 등급색을 쓰면 없는 판정을 만들고, 포인트색은 조작
 * 전용이다.
 *
 * 점은 8px에 **면 색 2px 링**을 두른다 — 상자 위에 겹쳐도 읽히게 하는 표준 처방이다.
 */
function DistributionTrack({
  distribution,
  value,
  code,
}: {
  distribution: ContributionEvidence['distribution'];
  value: number | null;
  code: ContributionEvidence['contribution']['code'];
}) {
  if (distribution === null) {
    return (
      <p className="text-[12px] text-fg-subtle">계열이 없어 분포를 낼 수 없습니다</p>
    );
  }

  const { min, q1, median, q3, max } = distribution;
  const span = max - min;
  /* 전 구간이 한 값이면 나눌 폭이 없다 — 가운데에 모아 둔다 */
  const at = (v: number) => (span === 0 ? 50 : ((v - min) / span) * 100);

  return (
    <div>
      <div className="relative h-2.5 w-full rounded-chip bg-surface-2 shadow-track">
        {/* 중앙 50% — 참조 맥락이라 중립색 */}
        <span
          className="absolute inset-y-0 rounded-[2px]"
          style={{
            left: `${at(q1)}%`,
            width: `${Math.max(at(q3) - at(q1), 1)}%`,
            backgroundColor: 'color-mix(in srgb, var(--missing) 34%, transparent)',
          }}
        />
        {/* 중앙값 — 하이라인 실선. 점선은 격자 어휘라 여기 쓰지 않는다 */}
        <span
          className="absolute inset-y-0 w-px"
          style={{ left: `${at(median)}%`, backgroundColor: 'var(--border-strong)' }}
        />
        {value !== null && (
          <span
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${at(value)}%`,
              backgroundColor: 'var(--actual)',
              /* 면 색 링 — 상자·중앙선 위에 겹쳐도 점이 읽힌다 */
              boxShadow: '0 0 0 2px var(--surface)',
            }}
          />
        )}
      </div>
      <p className="num mt-1 text-[12px] text-fg-subtle">
        {formatValue(code, min)}–{formatValue(code, max)}
        <span className="ml-1.5">· {distribution.count}점</span>
      </p>
    </div>
  );
}

/** 위치를 말로. **판정이 아니라 자리다** — `초과`·`정상` 같은 말을 쓰지 않는다 */
function rankLabel(percentile: number | null): string {
  if (percentile === null) return '—';
  if (percentile >= 50) return `상위 ${Math.round(100 - percentile)}%`;
  return `하위 ${Math.round(percentile)}%`;
}
