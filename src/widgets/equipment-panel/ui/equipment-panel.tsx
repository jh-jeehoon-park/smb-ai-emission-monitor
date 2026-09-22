'use client';

import {
  OPERATING_FILL,
  OPERATING_LABELS,
  operatingStateOf,
} from '@/shared/config/operating-visual';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { StatusBadge } from '@/shared/ui/status-badge';
import { BADGE_BASE } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';
import { VALUE_LG, VALUE_MD } from '@/shared/ui/type-scale';
import { EQUIPMENT_SIGNAL_LABELS, type Equipment } from '@/entities/equipment';

export function EquipmentPanel({
  items,
  online,
  onSelect,
}: {
  items: Equipment[];
  online: boolean;
  /** 상세를 여는 화면에서만 넘긴다. 없으면 카드가 눌리지 않는다 */
  onSelect?: (equipment: Equipment) => void;
}) {
  /* ECP가 끊기면 설비 텔레메트리도 오지 않는다. 계측·이상 점수는 결측인데 설비만
     멀쩡한 숫자를 띄우면 한 화면이 서로 다른 말을 한다(E3·R19). */
  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
        <p className={`num ${VALUE_LG} text-fg-subtle`}>—</p>
        <p className="text-[12px] text-fg-muted">설비 수신값 없음</p>
        <p className="max-w-[46ch] text-[12px] leading-relaxed text-fg-subtle">
          ECP 통신이 두절되어 설비 상태를 수신하지 못했습니다. 복구 시 로컬 버퍼가 일괄 전송됩니다.
        </p>
      </div>
    );
  }

  /*
   * **사업장 현황 요약 카드와 같은 구성으로 짠다** `[사용자 지시 2026-08-24]`.
   *
   * 예전에는 구분선(`divide-x`)으로 네 칸을 나누고 안쪽에 라벨·값을 표로 늘어놓았다.
   * 같은 화면 맨 위의 사업장 카드와 어휘가 달라, 한 페이지에서 같은 종류의 정보(이름 · 지금
   * 상태 · 보조 한 줄)를 두 가지 방법으로 읽어야 했다.
   *
   * 그래서 카드로 바꾼다 — 위: 이름 왼쪽 · 등급 뱃지 오른쪽 / 값: 가동 상태 / 아래: 이상 신호.
   * "카드 안에 카드를 넣지 않는다"는 예전 결정을 뒤집은 것인데, 그 규칙이 막으려던 것은
   * **위계 없는 중첩**이고 여기서는 격자의 한 칸이 곧 설비 한 대라 카드가 단위와 맞는다.
   */
  return (
    /*
     * **열 수를 뷰포트가 아니라 이 격자가 놓인 폭으로 정한다** `[사용자 결정 2026-09-18]`.
     * `screens.md` §8이 「중첩 격자는 뷰포트가 아니라 컨테이너로 묻는다」를 이미 규약으로
     * 세워 두었고, 이 격자가 그 규약을 어기고 있었다.
     *
     * 한때 `sm:grid-cols-2 xl:grid-cols-4`였다. 그 결과가 **뒤집혀 있었다** — 통합 관제의
     * 오른쪽 열은 1280px에서 428px뿐인데 `xl`이 켜져 **카드가 98px(안쪽 66px)**이 됐고,
     * 반대로 640~1279px(단일 열이라 훨씬 넓다)에서는 2열만 섰다(실측).
     *
     * **이 위젯이 스스로 컨테이너를 연다.** 네 화면이 쓰는데 컨테이너 안은 둘뿐이라
     * (통합 관제·관내 감독), 열지 않으면 나머지 둘(자사 현황·설비 예지보전)은 **질의가 한 번도
     * 맞지 않아 1열로 굳는다** — 화면에는 「좀 세로로 길다」로만 보인다.
     * `WaterQualityGrid`·`SiteWallboard`·`AnomalyPanel`이 이미 이 방식이다.
     *
     * **격자와 같은 요소에 얹으면 안 된다** — 컨테이너 질의는 **조상**만 본다. 같은 요소에
     * 둘을 적으면 조용히 아무 분기도 걸리지 않는다(`equipment-grid.test.ts`가 잠근다).
     *
     * 임계는 **카드 하한 190px**에서 나온다 — `site-wallboard`의 `@[190px]`이 「이름 왼쪽 ·
     * 뱃지 오른쪽 한 줄」이 성립하는 실측 하한이고, 위 주석대로 이 카드가 그 구성을 베꼈다.
     * 2열 400px → 카드 194px · 4열 832px → 카드 199px. **3열은 두지 않는다**: 설비가 4대라
     * 마지막 줄에 한 장이 남는다.
     */
    <div className="@container">
      <StaggerGroup className="grid grid-cols-1 gap-3 @[25rem]:grid-cols-2 @[52rem]:grid-cols-4">
        {items.map((eq) => {
          const state = operatingStateOf(eq.running);
          return (
            <RiseItem key={eq.id} className="h-full">
              <div
                className={cn(
                  'flex h-full flex-col gap-2 rounded-nested border border-border bg-surface p-4',
                  'transition-colors duration-200',
                  /* 누를 수 있을 때만 반응한다 — 표시에 hover를 주면 조작으로 읽힌다 */
                  onSelect && 'hover:border-border-strong hover:bg-surface-2',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* 이름만 누르게 둔다 — 카드 전체를 버튼으로 만들면 값까지 눌리는 영역이 된다 */}
                  {onSelect ? (
                    /*
                     * **누르는 자리를 위아래로 넓힌다** `[사용자 요청 2026-09-21]`. 글자 한 줄이라
                     * 실높이가 **18px**이었다(실측) — 상세 모달을 여는 이 화면의 주 조작인데
                     * 손가락 최소를 크게 밑돈다. `before`로 넓히므로 **카드 높이는 그대로다**
                     * (여백을 키우면 한 행의 카드들이 함께 자라 격자가 움직인다).
                     */
                    <button
                      type="button"
                      onClick={() => onSelect(eq)}
                      className='relative min-w-0 cursor-pointer truncate text-left text-[14px] font-bold leading-tight text-fg underline decoration-transparent underline-offset-2 transition-colors duration-200 before:absolute before:-inset-y-[11px] before:inset-x-0 before:content-[""] hover:text-accent hover:decoration-accent lg:before:content-none'
                    >
                      {eq.name}
                    </button>
                  ) : (
                    <p className="min-w-0 truncate text-[14px] font-bold leading-tight text-fg">
                      {eq.name}
                    </p>
                  )}
                  <StatusBadge level={eq.status} />
                </div>

                {/*
                 * 요약 카드의 큰 점수가 앉는 자리다. 여기 올 값은 **가동 여부**다 —
                 * 고장 확률·잔여 수명은 회의가 예지보전을 내리게 해 사라졌고 `[INC-107]`,
                 * 이상 여부는 0~100이 아니라 있음/없음이라 숫자로 세울 축이 아니다.
                 *
                 * 색은 등급이 아니라 운전 상태다(`OPERATING_FILL`) — 초록으로 칠한 `가동`은
                 * 화면에서 `정상 등급`으로 읽힌다(`design-system §2`).
                 */}
                <p className={`flex items-center gap-2 ${VALUE_MD} text-fg`}>
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: OPERATING_FILL[state] }}
                  />
                  {OPERATING_LABELS[state]}
                </p>

                {/* 아래 줄은 바닥에 붙는다 — 신호가 없는 카드와 있는 카드의 높이가 갈리지 않는다 */}
                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                  <span className="text-fg-subtle">이상 신호</span>
                  <span className="min-w-0 text-fg-muted">
                    {eq.signals.length === 0
                      ? '없음'
                      : eq.signals.map((signal) => EQUIPMENT_SIGNAL_LABELS[signal]).join(' · ')}
                  </span>
                  {/* 지속은 이상이 있을 때만 뜻이 있다 — 없을 때 `—`를 두면 빈 칸이 하나 더 늘어난다 */}
                  {eq.anomalyHours !== null && (
                    <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>
                      <span className="num">{eq.anomalyHours}</span>시간 이어짐
                    </span>
                  )}
                </div>
              </div>
            </RiseItem>
          );
        })}
      </StaggerGroup>
    </div>
  );
}

