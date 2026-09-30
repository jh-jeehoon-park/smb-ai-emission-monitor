'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { TAP_AREA_Y } from '@/shared/ui/action-button';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { PROVISIONAL_STATUS_LABELS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { SCORE_VALUE, WINDOW_HOURS } from '../config/constants';
import styles from './verdict-bar.module.scss';

/**
 * 화면 맨 위의 판정 — **카드가 아니라 띠다.**
 *
 * `Panel`·`StatTile`을 쓰지 않는다 `[사용자 요청 2026-09-10]`. 다른 화면은 판정을 흰 카드
 * 네 장(KPI 타일)으로 늘어놓는데, 여기는 **왼쪽에 등급 색 기둥을 세운 한 줄 띠**다 —
 * 훑는 눈이 첫 줄에서 멈추고 아래 대조로 바로 내려간다.
 *
 * 이상 점수·알람은 이 화면의 주제가 아니다 — **여기 한 줄과 링크로만** 닿는다(중복 금지).
 * 정본은 `/anomaly`와 `/alarms`다.
 *
 * **`embedded`는 껍데기를 벗는다.** 이 띠와 `처리 판정`이 각자 패널을 갖고 떨어져 있어
 * *"«91 위험»과 «처리 미흡 의심»의 연결이 약하다"* 는 지적을 받았다 `[사용자 지적 2026-09-10]`.
 * 지금은 둘이 **한 상자 안에서 hairline으로만 갈린다** — 둘이 같은 «현재 상태»라는 것이
 * 자리로 읽힌다. 내용은 한 글자도 바뀌지 않았다.
 */
export function VerdictBar({
  siteName,
  score,
  level,
  openAlarms,
  sourceLabel,
  observedAtIso,
  modelLabel,
  windowLabel,
  computedAtIso,
  pending,
  detailHref,
  embedded = false,
}: {
  siteName: string;
  score: number | null;
  level: StatusLevel | null;
  openAlarms: number;
  sourceLabel: string;
  observedAtIso: string;
  modelLabel: string;
  windowLabel: string;
  computedAtIso: string;
  pending: boolean;
  detailHref: string;
  /** 부모가 패널을 쥐고 있을 때. 아래 주석 참조 */
  embedded?: boolean;
}) {
  const visual = level ? STATUS_VISUAL[level] : null;

  return (
    <div
      className={cn(styles.root, embedded ? styles.embedded : styles.standalone)}
    >
      {/*
       * 등급 색 기둥. **색이 유일한 축이 아니다** — 오른쪽에 등급 라벨이 글자로 함께 있다
       * (E2의 «색 옆에 늘 라벨을 둔다»).
       */}
      <span
        aria-hidden
        className={styles.levelBar}
        style={{
          backgroundColor: visual ? statusInk(visual) : 'var(--missing)',
        }}
      />

      <div className={styles.body}>
        <div className={styles.score}>
          {pending ? (
            <span className={cn(styles.scoreSkeleton, 'pulse')} />
          ) : score !== null && level && visual ? (
            <>
              {/*
               * **38px → 28px.** 이 상자에 히어로가 둘일 수 없다 — 아래 `처리 판정`이 이
               * 화면의 답이고, 둘이 같은 크기면 먼저 오는 이 숫자가 자리로 이긴다
               * `[사용자 요청 2026-09-10: 숫자 자체가 페이지의 모든 정보보다 과도하게
               * 강조되지 않도록]`. **등급 색·라벨·자리는 그대로다.**
               */}
              <span className={cn(SCORE_VALUE, 'num')} style={{ color: statusInk(visual) }}>
                {score}
              </span>
              <span className={styles.levelLabel} style={{ color: statusInk(visual) }}>
                {PROVISIONAL_STATUS_LABELS[level]}
              </span>
            </>
          ) : (
            <span className={styles.noScore}>이상 점수 수신 없음</span>
          )}
        </div>

        <div className={styles.site}>
          <p className={styles.siteName}>{siteName}</p>
          <p className={styles.siteMeta}>
            {`미확인 알람 ${openAlarms}건 · ${sourceLabel}`}
          </p>
        </div>

        <dl className={styles.facts}>
          <Fact label="기준 시각">
            {`${formatDateTime(observedAtIso)} ${DISPLAY_TIMEZONE} · ${COLLECTION_INTERVAL_MINUTES}분 주기 · 최근 ${WINDOW_HOURS}시간`}
          </Fact>
          {/* AI 산출은 값과 함께 산출 시각·기간·모델을 병기한다(E3) */}
          <Fact label="AI 산출">
            {`${modelLabel} · ${windowLabel} · ${formatDateTime(computedAtIso)} ${DISPLAY_TIMEZONE}`}
          </Fact>
        </dl>

        <Link
          href={detailHref}
          className={cn(TAP_AREA_Y, styles.detailLink)}
        >
          사업장 상세
          <ChevronRight aria-hidden size={16} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{children}</dd>
    </div>
  );
}
