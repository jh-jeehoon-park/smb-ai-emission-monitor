'use client';

import { ACTUAL_HEX } from '@/shared/config/status-visual';
import { PROVISIONAL_TREATMENT_SIMILAR_PERCENT } from '@/shared/config/provisional';
import { cn } from '@/shared/lib/cn';
import { HERO_VALUE, INLET_MARK_COLOR } from '../config/constants';
import type { InOutCompare } from '../lib/point-readings';
import { GaugeCard } from './gauge-card';
import { SummaryDonut } from './summary-donut';

/**
 * **유입 ↔ 유출 수질 대조** — 이 화면의 주인공.
 *
 * `[회의 2026-09-08]`이 판정을 정했다 — *"유입·유출에 동일한 센서를 달아 놓고 … 동일할 시
 * 문제가 있는 것"*. **물의 양은 이것을 말하지 않는다** `[사용자 지적 2026-09-10]`: 들어온
 * 만큼 나가는 것은 정상이고, 처리가 됐는지를 말하는 것은 수질이다.
 *
 * **«개선»의 방향을 주장하지 않는다.** 처리로 무엇이 얼마나 줄어야 하는지는 원문에 없고
 * (DO는 폭기로 오히려 오른다), 회의가 준 판정도 방향이 아니라 **차이의 크기**다.
 *
 * ## 짜임을 세 번 고쳤다 — 앞의 둘을 지우지 않는다
 *
 * | 판본 | 왜 물렀나 |
 * |---|---|
 * | 좌우로 벌어지는 **막대** | 정규화 탓에 한쪽이 늘 가득 차 **두 막대가 한 덩어리로 읽혔다**. 그리고 *"막대·프로그래스바 형식으로는 만들지 말 것"* `[사용자 요청 2026-09-10]` |
 * | 눈금 위 **두 점** | 0을 기준으로 잡아 두 점이 트랙 오른쪽 끝 93~100%에 몰렸다(캡처로 확인) |
 *
 * **둘 다 같은 뿌리였다** — 유입과 유출은 원래 비슷한 크기라 두 값을 각자 길이로 그리면
 * 차이가 전체의 7%밖에 안 된다. 지금 판본은 그 차이를 **따로 그린다**(`GaugeArc`의 간극 호).
 *
 * ## 격자는 저장소의 관용구를 쓴다
 *
 * 한때 *"다른 화면은 흰 카드를 격자에 늘어놓는데 여기는 한 줄에 두 지점이 마주 보는 짜임이다"*
 * 라 적고 줄 목록을 고집했다. **그 촘촘함이 대조를 못 보이게 했다** — 항목마다 그림 한 장을
 * 온전히 줘야 세 호가 들어간다. 새로 만든 것은 **그림**이고(`GaugeArc`·`GaugeCard`·
 * `SummaryDonut`), 격자·카드 껍데기는 `water-quality-grid`의 것과 같은 값을 쓴다 — 껍데기까지
 * 새로 만들면 같은 저장소에서 카드가 두 종류가 된다.
 *
 * **설비 형태를 그리지 않는다.** 소규모 처리시설의 물리적 형태는 원문·회의·데이터셋 어디에도
 * 없다(2026-09-10 조사) — 그리면 지어낸 형태가 된다.
 */
export function TreatmentScale({
  compare,
  pending,
  siteId,
}: {
  compare: InOutCompare;
  pending: boolean;
  /**
   * **`key`에 들어간다.** 사업장을 바꿔도 `key`가 그대로면 React가 같은 노드를 재사용해
   * `initial`을 다시 밟지 않는다 — 호가 처음 들어왔을 때만 자라고 그 뒤로는 값만 튄다.
   * §8 `진입 모션`이 같은 함정을 이미 적어 두었다.
   */
  siteId: string;
}) {
  return (
    <div className="rounded-panel border border-card-border bg-surface p-5 shadow-panel lg:p-6">
      {/*
       * **판정은 여기 없다 — 위 상태 상자로 올라갔다** `[사용자 지적 2026-09-10: «91 위험»과
       * «처리 미흡 의심»의 연결이 약하다]`. 두 상태가 각자 패널을 갖고 떨어져 있어 서로
       * 무관해 보였다. 지금은 `TreatmentVerdictBand`가 `VerdictBar`와 한 상자에서 hairline으로
       * 갈리고, 이 패널은 **그 판정의 근거**(범례 + 카드 여덟 장 + 출처 고지)만 갖는다.
       */}
      <Legend />

      {/*
       * **열 수를 뷰포트가 아니라 «이 격자가 받은 폭»이 정한다**(`@container`).
       * `water-quality-grid`가 같은 값을 쓰고 그 이유를 적어 두었다 — 뷰포트로 나누면 같은
       * 격자가 넓은 자리와 좁은 자리에 함께 놓일 때 한쪽이 반드시 어긋난다.
       */}
      {/*
       * **두 값이 가로로 마주 서면서 카드에 최소 폭이 생겼다.** 한 장 안에 22px 숫자 둘과
       * `→`가 한 줄에 들어가야 하고, 그 위에 두 지점 이름이 또 한 줄로 선다 — 실측으로 카드
       * 155px에서 **값이 `10…`으로 잘렸다**(390px 캡처). **숫자가 잘리는 것은 틀린 값을 적는
       * 것**이라 열 수로 막는다.
       *
       * 그래서 문턱이 둘에서 셋으로 늘었다 — 좁으면 **한 열**로 서고 카드가 온전한 폭을 갖는다.
       * `430`·`870`은 카드 한 장에 최소 ~210px를 주는 값이다(간격 8px 포함). 카드 안의 짜임은
       * **어느 폭에서도 같다** `[사용자 요청 2026-09-10: 8개 카드의 내부 구조와 간격을 완전히
       * 통일한다]` — 달라지는 것은 몇 장이 한 줄에 서는가뿐이다.
       */}
      <div className="@container mt-3">
        <div className="grid grid-cols-1 gap-2 @[430px]:grid-cols-2 @[870px]:grid-cols-4">
          {compare.treatment.map((row, index) => (
            <GaugeCard key={`${siteId}-${row.code}`} row={row} pending={pending} index={index} />
          ))}
        </div>
      </div>

      {/*
       * **유입값의 출처를 화면이 스스로 밝힌다** `[TBD-59]`. 범례의 `시연값`이 첫 번째
       * 방어선이고 이 한 줄이 그것이 무엇을 뜻하는지 말한다 — 밝히지 않고 섞는 것이 E4가
       * 막는 것이고, 밝히면 시연 기준치(`PROVISIONAL_DEMO_LIMITS`)와 같은 지위가 된다.
       */}
      <p className="mt-3 text-[12px] leading-relaxed text-fg-subtle">
        유입 수질은 계측 서버에 채널이 없어 유출 실측에서 역산한 <b className="font-semibold">시연값</b>
        입니다. 잔존율과 유사 판정 기준({PROVISIONAL_TREATMENT_SIMILAR_PERCENT}%)은 원문에 없어
        우리가 정했습니다 [TBD-59].
      </p>
    </div>
  );
}

/**
 * 처리가 됐는가 — 한 줄 답과 그것을 센 도넛.
 *
 * **상태 등급 색을 쓰지 않는다.** 이 축은 이상 점수가 아니라 «두 지점이 얼마나 다른가»여서,
 * 같은 색 체계를 쓰면 위쪽 판정 띠와 같은 것을 말하는 것처럼 읽힌다. 무게와 자리로 가른다.
 */
/**
 * **처리 판정 띠 — 이상 점수 띠와 한 상자에 선다.**
 *
 * `[사용자 지적 2026-09-10: «91 위험»과 «처리 미흡 의심»의 연결이 약하다 · 서로 어떤 관계인지
 * 자연스럽게 이해할 수 있도록 레이아웃과 typography를 개선]`.
 *
 * 그래서 이 띠는 **자기 패널을 갖지 않는다.** 위 `VerdictBar`(`embedded`)와 hairline 하나로
 * 갈려 «둘 다 지금 상태»라는 것이 자리로 읽힌다. 둘의 관계는 **자리가** 말한다 —
 * **새 설명도 새 라벨도 덧붙이지 않았다** `[사용자 요청 2026-09-10: 새로운 설명이나 수치를
 * 추가하지 마라]`.
 *
 * **이 상자에서 히어로는 이것 하나다** `[사용자 요청 2026-09-10: «처리 미흡 의심»을 현재
 * 페이지의 핵심 상태로 명확하게 보이게 한다]`. 위 이상 점수가 38 → 28px로 내려가 이 판정
 * 문구가 화면에서 가장 큰 글자가 됐다 — 둘이 같은 크기일 때는 먼저 오는 숫자가 자리로 이겼다.
 *
 * **상태 등급 색을 쓰지 않는다.** 이 축은 이상 점수가 아니라 «두 지점이 얼마나 다른가»여서,
 * 같은 색 체계를 쓰면 위 띠와 같은 것을 말하는 것처럼 읽힌다. 무게와 자리로 가른다.
 */
export function TreatmentVerdictBand({
  compare,
  pending,
}: {
  compare: InOutCompare;
  pending: boolean;
}) {
  const { verdict } = compare;

  return (
    <section className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
      {pending ? (
        <span className="block h-9 w-48 animate-pulse rounded-chip bg-surface-3" />
      ) : (
        <>
          <SummaryDonut verdict={verdict} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
              처리 판정
            </p>
            <h2
              className={cn(
                HERO_VALUE,
                'mt-0.5',
                verdict.kind === 'ok' ? 'text-fg-muted' : 'text-fg',
              )}
            >
              {verdict.headline}
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{verdict.detail}</p>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * **세 호를 읽는 법.** 그림의 뜻을 글이 한 번 못박는다(**E3**·**E4**) — 채움 유무와 자리는
 * 형태로만은 «장식»으로 읽힐 수 있다. 카드마다 배지를 되풀이하는 대신 여기 한 번이다.
 */
function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-subtle">
      <Item swatch={<Ring color={INLET_MARK_COLOR} />}>유입수 · 시연값</Item>
      <Item swatch={<Dot color={ACTUAL_HEX} />}>유출수 · 실측</Item>
      {/* 견본은 실제 호와 같은 잉크여야 한다 — 호가 `--fg-muted`로 내려갔다 */}
      <Item swatch={<span aria-hidden className="block h-0.5 w-3.5 rounded-full bg-fg-muted" />}>
        걷어낸 만큼
      </Item>
    </ul>
  );
}

function Item({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      {swatch}
      {children}
    </li>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function Ring({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="block size-2.5 shrink-0 rounded-full bg-surface"
      style={{ border: `2px solid ${color}` }}
    />
  );
}
