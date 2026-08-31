'use client';

import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatDateTime } from '@/shared/lib/format';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AnomalyGauge } from '@/shared/ui/anomaly-gauge';
import { BADGE_BASE } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { VALUE_LG } from '@/shared/ui/type-scale';
import { CountUp } from '@/shared/ui/motion';
import { MeterBar } from '@/shared/ui/meter-bar';
import type { ReactNode } from 'react';
import type { AnomalySummary } from '@/entities/anomaly';

/**
 * **데이터 처리율·시스템 가동률 뱃지를 걷었다** `[사용자 요청 2026-08-28]`.
 *
 * 두 값은 원문 성과지표(p.3·p.119)이고 한때 이 카드 안, 게이지 바로 아래에 작은 뱃지로
 * 있었다 — 그 판정이 **믿을 만한 상태에서 나왔는가**를 말하는 보조값이라는 것이 근거였다.
 * 사용자가 두 화면 모두에서 내리기로 정했다. **값은 사라지지 않았다** — 사업장 모델
 * (`Site.dataThroughput`·`Site.uptime`)과 시연 시나리오에 그대로 있고, 다시 세울 자리가
 * 생기면 여기 뱃지 두 개를 되돌리면 된다.
 *
 * 아래 [모델][기간][산출] 세 뱃지는 **남긴다** `[사용자 결정 2026-08-28]` — 그쪽은 AI 산출
 * 근거라 E3가 값과 함께 노출을 요구한다.
 */
export function AnomalyPanel({
  summary,
  legend,
}: {
  summary: AnomalySummary;
  legend?: ReactNode;
}) {
  // 값이 없으면 임의 보간이나 0으로 채우지 않고 빈 상태로 둔다(E3·R19)
  if (summary.score === null || summary.level === null) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
        <p className={`num ${VALUE_LG} text-fg-subtle`}>—</p>
        <p className="text-[12px] text-fg-muted">산출값 없음</p>
        <p className="max-w-[34ch] self-center text-[12px] leading-relaxed text-fg-subtle">
          ECP 통신이 두절되어 이상 점수가 산출되지 않았습니다. 마지막 수신{' '}
          <span className="num">{formatDateTime(summary.computedAtIso)}</span> KST.
        </p>
      </div>
    );
  }

  const visual = STATUS_VISUAL[summary.level];
  const level = summary.level;
  const score = summary.score;

  /*
   * **두 칸으로 나눈다** `[사용자 지시 2026-08-24]` — 점수 덩어리 · 기여 변수.
   * 근거 3항목은 표에서 뱃지로 바꿔 점수 아래에 붙였다: 점수·등급·게이지·근거는
   * '이 판정이 무엇에서 나왔는가'라는 한 이야기라 한 덩어리로 두는 것이 맞다.
   *
   * 좁아지면(컨테이너 512px 미만) 다시 쌓는다 — 카드 본문이 1280px에서 376px이라
   * 두 칸을 나누면 XAI 막대의 라벨과 퍼센트가 한 줄에 들어가지 않는다.
   */
  return (
    <div className="@container" key={`${summary.computedAtIso}-${score}`}>
      <div className="grid gap-5 @[32rem]:grid-cols-[minmax(0,260px)_minmax(0,1fr)] @[32rem]:items-stretch">
        {/*
         * 점수 덩어리를 **등급색 은은한 그라데이션 면** 위에 올린다 `[사용자 지시 2026-08-24]`.
         *
         * **위는 17% 그대로, 아래로 갈수록 투명해진다** `[사용자 지시 2026-08-24]`.
         * 끝을 `transparent`로 두므로 면이 카드 색과 섞여 사라지고, 어떤 면 위에 놓든 그 면과
         * 이어진다 — `--surface`로 섞던 값은 카드 색이 바뀌면 어긋난다.
         * 진한 쪽이 위인 것은 그대로다: 위가 밝고 아래가 진하면 빛이 아래에서 오는 것처럼 보인다.
         *
         * **올린 만큼 점수 글자의 그라데이션을 좁혔다.** 밝은 끝을 마크색 40%까지 밀면 17% 면에서
         * 주의가 2.96:1로 큰 글자 기준(3:1)을 밑돈다 — 30%로 좁히면 3.24:1이 된다.
         * 색이 옅어 보이던 것을 되돌리는 것이지 등급을 면으로 말하려는 것이 아니다.
         */}
        <div
          className="rounded-nested p-4"
          style={{
            backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${visual.hex} 17%, transparent), transparent)`,
          }}
        >
          <div className="flex items-end justify-between gap-3">
            {/*
             * 점수를 **그라데이션 글자**로 칠한다 `[사용자 지시 2026-08-24·25]`.
             *
             * 세 단이고 **살짝 기울어 있다**(165°) — 위는 잉크, 가운데까지 잉크를 유지하다
             * 아래에서 마크 쪽으로 **30%** 민다. 위아래 두 단만 두면 글자 전체가 고르게 흐려
             * 그라데이션인지 흐린 글자인지 알 수 없었다. 기울기를 준 것은 숫자의 사선 획
             * (`4`·`7`)에서 색이 도는 것이 보이게 하기 위해서이며, 15°를 넘기면 자릿수마다
             * 색이 달라 보인다.
             *
             * 30%가 상한이다 — 면이 17%로 진해지면서 40%로는 주의가 2.96:1로 큰 글자 기준(3:1)을
             * 밑돈다(30%에서 3.24:1). 100%까지 밀면 흰 면에서도 1.97:1로 떨어진다.
             */}
            <p
              className="num text-gradient text-[56px] font-bold leading-none tracking-tight"
              style={{
                backgroundImage: `linear-gradient(165deg, ${visual.ink} 0%, ${visual.ink} 42%, color-mix(in srgb, ${visual.hex} 30%, ${visual.ink}) 100%)`,
              }}
            >
              <CountUp value={score} />
            </p>
            <div className="pb-1.5 text-right">
              <StatusBadge level={level} />
              {/* 17% 면에서 `--fg-subtle`은 위험 등급일 때 4.46:1로 본문 기준을 아주 조금 밑돈다 */}
              <p className="mt-1.5 text-[12px] text-fg-muted">이상 점수 / 100</p>
            </div>
          </div>

          <AnomalyGauge score={score} className="mt-4" />

          {/*
           * AI 산출값은 언제·무엇을 근거로 나왔는지 함께 보여야 한다(E3).
           * **라벨을 뱃지 안에 남긴다** — 값만 두면 `최근 24시간`이 무엇의 기간인지 알 수 없다.
           */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Meta label="모델" value={summary.modelLabel} />
            <Meta label="기간" value={summary.windowLabel} />
            <Meta label="산출" value={`${formatDateTime(summary.computedAtIso)} KST`} mono />
          </div>
        </div>

        {/*
         * **왼쪽 점수 덩어리와 같은 높이에서 끝난다** `[사용자 지시 2026-08-24]` —
         * 칸을 `items-stretch`로 늘리고 이 열을 `h-full`로 채운다. 예전에는 두 칸이 각자
         * 내용만큼만 높아 XAI 목록이 점수 면보다 짧게 끊기거나 반대로 삐져나왔다.
         * 막대 5개는 `justify-between`으로 남는 높이를 나눠 갖고, 범례는 `mt-auto`로 바닥이다.
         */}
        <div className="flex h-full min-w-0 flex-col">
          <Eyebrow className="mb-2">주요 기여 변수 · XAI</Eyebrow>
          {/* 막대를 3→8px로 키운다 — 3px는 선이라 길이 차이가 읽히지 않았다 */}
          <ul className="flex flex-1 flex-col justify-between gap-2.5">
            {summary.contributions.map((c, i) => {
              const up = c.direction === 'up';
              const Arrow = up ? TrendingUp : TrendingDown;
              return (
                <li key={c.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-fg-muted">
                      {/* 도형 문자(▲▼)를 아이콘으로 바꾼다 — 폰트마다 크기·기준선이 달라 글자와 어긋났다 */}
                      {/*
                       * **방향은 화살표 모양이 나르고 색은 등급 하나뿐이다**
                       * `[사용자 지적 2026-08-31]`. 하강 기여를 `--actual`로 칠하던 판본은
                       * 아래 범례(정상·주의·경고·위험 네 색)에 없는 **다섯 번째 색**을
                       * 화면에 세웠다 — 안동 염색 1공장은 `DO 용존산소`가 하강이라 초록 막대
                       * 넷 사이에 파란 막대가 하나 섰다.
                       *
                       * 게다가 `--actual`은 **그래프 실측 계열색**이다(§8 `그래프 색`) —
                       * 다른 모든 차트에서 «실측»을 뜻하는 색을 여기서만 «하강»으로 쓰면
                       * 같은 색이 화면마다 다른 것을 말한다. 방향은 `TrendingUp`/`TrendingDown`
                       * 모양과 `sr-only` 문구가 이미 나른다(§3.1이 그렇게 규정한다).
                       */}
                      <Arrow
                        aria-hidden
                        size={13}
                        strokeWidth={2.2}
                        className="shrink-0"
                        style={{ color: statusInk(visual) }}
                      />
                      <span className="truncate">{c.label}</span>
                      <span className="sr-only">{up ? '상승 기여' : '하강 기여'}</span>
                    </span>
                    <span className="num shrink-0 text-[12px] font-medium text-fg-muted">
                      {(c.weight * 100).toFixed(PROVISIONAL_DISPLAY_DECIMALS.contributionPercent)}%
                    </span>
                  </div>
                  {/*
                   * 막대는 공용 부품이다 — 운영 최적화의 주입량·운전 조건 막대가 같은 것을 쓴다.
                   * **다섯 막대가 한 색이다**: 길이가 «얼마나 기여했는가»를 말하는데 색이 둘이면
                   * 길이 비교가 두 무리로 갈린다. 방향은 위 화살표가 나른다.
                   */}
                  <MeterBar
                    percent={c.weight * 100}
                    color={visual.hex}
                    delay={0.1 + i * 0.06}
                  />
                </li>
              );
            })}
          </ul>

          {/* 4구간 경계. `mt-auto`가 판정 줄의 바닥에 붙여 두 칸이 같은 선에서 끝난다 */}
          {legend && <div className="mt-3 flex justify-end">{legend}</div>}
        </div>
      </div>
    </div>
  );
}

/** 근거 한 항목. 라벨과 값이 한 뱃지 안에 있어야 값이 무엇인지 알 수 있다 */
function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className={`${BADGE_BASE} max-w-full bg-surface text-fg-muted`}>
      <span className="shrink-0 text-fg-subtle">{label}</span>
      <span className={mono ? 'num truncate' : 'truncate'}>{value}</span>
    </span>
  );
}
