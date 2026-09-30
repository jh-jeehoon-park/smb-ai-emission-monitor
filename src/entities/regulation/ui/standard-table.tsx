import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { BADGE_BASE } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';
import { STANDARD_STATUS_LABELS } from '../config/constants';
import type { ResolvedStandard, StandardStatus } from '../model/types';
import styles from './standard-table.module.scss';

/**
 * **「왜 이 사업장 이 항목에 이 값이 적용됐는가」를 화면이 말한다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 숫자 하나만 적던 표는 그 값이 법령에서 온 것인지 우리가 넣은 시연값인지, 무엇을 몰라서
 * 아직 확정이 아닌지를 말하지 못했다 — 그 판단이 전부 코드 안에 있어 **화면에서 검토할 수
 * 없었다.** 이 화면은 mock으로 채워 회의에서 형태를 판별하는 대상이므로
 * `[사용자 지적 2026-09-28]`, 판단의 근거가 화면에 있어야 한다.
 *
 * **표가 아니라 항목 카드의 목록이다** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 * 다섯 열 표는 마지막 열(근거 문장)이 폭을 다 가져가 앞의 넷이 좁은 칸에 몰렸고, 좁은 화면에서는
 * 가로로 밀어야만 근거가 보였다. 한 항목을 한 덩어리로 두면 **항목 · 값 · 근거**가 한눈에
 * 묶이고, 좁으면 위아래로 쌓인다(`@container`).
 *
 * **표시 전용이다.** 사업장도 계산도 모르고 `ResolvedStandard`만 받는다 — 위젯이 사업장 훅을
 * 부르면 라우터 없이는 렌더도 못 한다(계측 격자에서 한 번 밟았다).
 */

/**
 * 상태 뱃지의 색.
 *
 * **`확정`에 초록을 쓰지 않는다** — 초록은 계측 등급 `정상`의 색이라 «기준이 확정됐다»가
 * «이 사업장은 정상이다»로 읽힌다(§8 `상태색`). 확정은 가장 진한 중립이다. 시연 임계값은
 * 주의 틴트 — 시연 임계 초과가 쓰는 색 축과 같다.
 */
const STATUS_TONE: Record<StandardStatus, string> = {
  RESOLVED: styles.toneResolved,
  PROVISIONAL: styles.toneProvisional,
  UNRESOLVED: styles.toneUnresolved,
  NOT_APPLICABLE: styles.toneNotApplicable,
  CONFLICT: styles.toneConflict,
};

export interface StandardRow {
  /** 화면 라벨. 계측 항목이 아닌 것(SS)도 자리를 지킨다 */
  label: string;
  code: MeasurementItemCode | null;
  /** `code`가 `null`이면 판정 자체가 없다 */
  standard: ResolvedStandard | null;
}

export function StandardTable({ rows }: { rows: readonly StandardRow[] }) {
  return (
    <div className={styles.root}>
      <ul aria-label="이 사업장에 적용되는 방류 기준" className={styles.list}>
        {rows.map((row) => (
          <li
            key={row.label}
            className={cn(
              styles.item,
              row.standard === null ? styles.itemUnmeasured : styles.itemMeasured,
            )}
          >
            <div className={styles.head}>
              <p className={cn(styles.label, 'num')}>{row.label}</p>
              {row.standard ? (
                <span className={cn(BADGE_BASE, STATUS_TONE[row.standard.status])}>
                  {STANDARD_STATUS_LABELS[row.standard.status]}
                </span>
              ) : (
                <span className={cn(BADGE_BASE, styles.toneUnmeasured)}>계측 없음</span>
              )}
            </div>

            <div>
              <p className={styles.caption}>적용 기준</p>
              <ValueCell row={row} />
              <p className={styles.effective}>
                시행일{' '}
                {/* 자리표시 날짜를 인쇄하지 않는다 — 실제 시행일로 읽힌다 */}
                <span className={styles.muted}>
                  {row.standard === null
                    ? '—'
                    : (row.standard.effectiveFrom?.slice(0, 10) ?? '미상')}
                </span>
              </p>
            </div>

            <div className={styles.why}>
              <p className={styles.caption}>왜 이 값인가</p>
              <WhyCell row={row} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValueCell({ row }: { row: StandardRow }) {
  const { standard, code } = row;
  /* 계측하지 않는 항목은 기준을 넣어도 견줄 값이 없다 — 빈 칸이 아니라 그 사실을 적는다 */
  if (code === null || standard === null) {
    return <p className={styles.valueNone}>—</p>;
  }

  const { min, max } = standard;
  if (min === null && max === null) {
    return <p className={styles.valueNone}>—</p>;
  }

  const item = MEASUREMENT_ITEMS[code];
  const { decimals } = item;
  let text: string;
  if (min !== null && max !== null) text = `${min.toFixed(decimals)}–${max.toFixed(decimals)}`;
  else if (max !== null) text = `≤ ${max.toFixed(decimals)}`;
  else text = `≥ ${min!.toFixed(decimals)}`;

  return (
    <p className={styles.value}>
      <span className={cn(styles.valueText, 'num')}>{text}</span>
      {item.unit && <span className={styles.valueUnit}>{item.unit}</span>}
    </p>
  );
}

/**
 * 결정 근거 한 줄 + **펼치면 전부**.
 *
 * 한 줄만 두면 「왜 다른 규정은 안 걸렸는가」를 알 수 없고, 전부 펼쳐 두면 다섯 항목이
 * 스무 줄이 되어 목록을 읽을 수 없다. `<details>`라 자바스크립트를 쓰지 않고 서버 렌더에서도
 * 같은 마크업이다.
 */
function WhyCell({ row }: { row: StandardRow }) {
  const standard = row.standard;
  if (standard === null) {
    return <p className={styles.whyNone}>이 시스템이 측정하지 않는 항목입니다</p>;
  }

  const decisive =
    standard.trace.find((entry) => entry.outcome === 'DECISIVE') ??
    standard.trace.find((entry) => entry.outcome === 'CONFLICT') ??
    standard.trace.find((entry) => entry.outcome === 'UNKNOWN_FACT');

  /* 무엇을 몰라서 확정하지 못했는가 — 회의에서 물어야 할 것이 여기 모인다 */
  const missing = [...new Set(standard.trace.flatMap((entry) => entry.missing ?? []))];

  return (
    <div className={styles.whyBody}>
      <p className={styles.reason}>
        {decisive?.reason ?? '걸리는 규정이 없습니다'}
      </p>
      {missing.length > 0 && (
        <p className={styles.missing}>
          확인 필요 · <span className={styles.muted}>{missing.join(' · ')}</span>
        </p>
      )}
      {standard.trace.length > 1 && (
        <details>
          <summary className={styles.toggle}>
            규정 {standard.trace.length}건 모두 보기
          </summary>
          <ul className={styles.trace}>
            {standard.trace.map((entry, index) => (
              <li key={`${entry.ruleId ?? 'none'}-${index}`} className={styles.traceEntry}>
                <span className={styles.muted}>{entry.ruleId ?? '—'}</span> · {entry.outcome} ·{' '}
                {entry.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
