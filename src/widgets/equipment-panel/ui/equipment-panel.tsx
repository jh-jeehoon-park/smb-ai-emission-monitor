'use client';

import {
  OPERATING_FILL,
  OPERATING_LABELS,
  operatingStateOf,
} from '@/shared/config/operating-visual';
import { TAP_AREA_Y } from '@/shared/ui/action-button';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { StatusBadge } from '@/shared/ui/status-badge';
import { BADGE_BASE } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';
import { VALUE_LG, VALUE_MD } from '@/shared/ui/type-scale';
import { EQUIPMENT_SIGNAL_LABELS, type Equipment } from '@/entities/equipment';
import styles from './equipment-panel.module.scss';

export function EquipmentPanel({
  items,
  online,
  onSelect,
  meteredIds = [],
}: {
  items: Equipment[];
  online: boolean;
  /** 상세를 여는 화면에서만 넘긴다. 없으면 카드가 눌리지 않는다 */
  onSelect?: (equipment: Equipment) => void;
  /**
   * **전력을 재는 설비의 id** `[사용자 요청 2026-09-21]`. 카드에 그 사실을 적는다 —
   * 어느 설비에 통신형 전력량계를 달지가 곧 설치 범위이고, 정해 두고도 화면에 없으면
   * 검토할 수가 없다.
   *
   * **`limits`·`absentCodes`와 같이 prop으로 받는다** — 위젯이 사업장 훅을 부르면
   * 라우터 없이는 렌더도 못 한다(계측 격자에서 한 번 밟았다).
   */
  meteredIds?: readonly string[];
}) {
  /* ECP가 끊기면 설비 텔레메트리도 오지 않는다. 계측·이상 점수는 결측인데 설비만
     멀쩡한 숫자를 띄우면 한 화면이 서로 다른 말을 한다(E3·R19). */
  if (!online) {
    return (
      <div className={styles.offline}>
        <p className={cn('num', VALUE_LG, styles.offlineValue)}>—</p>
        <p className={styles.offlineLabel}>설비 수신값 없음</p>
        <p className={styles.offlineNote}>
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
     * **이 위젯이 스스로 컨테이너를 연다.** 네 화면이 쓰는데 컨테이너 안은 둘뿐이라
     * (통합 관제·관내 감독), 열지 않으면 나머지 둘(자사 현황·설비 예지보전)은 **질의가 한 번도
     * 맞지 않아 1열로 굳는다** — 화면에는 「좀 세로로 길다」로만 보인다.
     * `WaterQualityGrid`·`SiteWallboard`·`AnomalyPanel`이 이미 이 방식이다.
     *
     * **격자와 같은 요소에 얹으면 안 된다** — 컨테이너 질의는 **조상**만 본다. 같은 요소에
     * 둘을 적으면 조용히 아무 분기도 걸리지 않는다(`equipment-grid.test.ts`가 잠근다).
     */
    <div className={styles.container}>
      <StaggerGroup className={styles.grid}>
        {items.map((eq) => {
          const state = operatingStateOf(eq.running);
          return (
            <RiseItem key={eq.id} className={styles.cell}>
              <div
                className={cn(
                  styles.card,
                  /* 누를 수 있을 때만 반응한다 — 표시에 hover를 주면 조작으로 읽힌다 */
                  onSelect && styles.cardInteractive,
                )}
              >
                <div className={styles.cardHead}>
                  {/* 이름만 누르게 둔다 — 카드 전체를 버튼으로 만들면 값까지 눌리는 영역이 된다 */}
                  {onSelect ? (
                    /*
                     * **누르는 자리를 위아래로 넓힌다** `[사용자 요청 2026-09-21]`. 글자 한 줄이라
                     * 실높이가 **18px**이었다(실측) — 상세 모달을 여는 이 화면의 주 조작인데
                     * 손가락 최소를 크게 밑돈다. `TAP_AREA_Y`는 **카드 높이를 바꾸지 않는다**
                     * (여백을 키우면 한 행의 카드들이 함께 자라 격자가 움직인다).
                     */
                    <button
                      type="button"
                      onClick={() => onSelect(eq)}
                      className={cn(TAP_AREA_Y, styles.nameButton)}
                    >
                      {eq.name}
                    </button>
                  ) : (
                    <p className={styles.name}>
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
                <p className={cn(styles.operating, VALUE_MD)}>
                  <span
                    aria-hidden
                    className={styles.operatingDot}
                    style={{ backgroundColor: OPERATING_FILL[state] }}
                  />
                  {OPERATING_LABELS[state]}
                </p>

                {/* 아래 줄은 바닥에 붙는다 — 신호가 없는 카드와 있는 카드의 높이가 갈리지 않는다 */}
                <div className={styles.signals}>
                  <span className={styles.signalsLabel}>이상 신호</span>
                  <span className={styles.signalsValue}>
                    {eq.signals.length === 0
                      ? '없음'
                      : eq.signals.map((signal) => EQUIPMENT_SIGNAL_LABELS[signal]).join(' · ')}
                  </span>
                  {/* 지속은 이상이 있을 때만 뜻이 있다 — 없을 때 `—`를 두면 빈 칸이 하나 더 늘어난다 */}
                  {eq.anomalyHours !== null && (
                    <span className={cn(BADGE_BASE, styles.chip)}>
                      <span className="num">{eq.anomalyHours}</span>시간 이어짐
                    </span>
                  )}
                  {/*
                   * **전력 계측 대상임을 카드가 말한다** `[사용자 요청 2026-09-21]`.
                   *
                   * 고른 설비가 곧 **통신형 전력량계를 다는 대상**이라 설치 범위·비용이 된다 —
                   * 정해 두고 화면에 없으면 검토할 수가 없다. 고르지 않은 설비에는 아무것도
                   * 적지 않는다: 대부분이 미선정이라 «미계측»을 달면 그 말이 카드를 덮는다.
                   */}
                  {meteredIds.includes(eq.id) && (
                    <span className={cn(BADGE_BASE, styles.chip)}>전력 계측</span>
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

