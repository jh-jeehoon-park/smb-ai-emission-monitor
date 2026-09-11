'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { MISSING_HATCH, OPERATING_GRADIENT } from '@/shared/config/operating-visual';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { BAND_ROW_H_PX, MIN_BAND_PX, TICK_HOURS, WINDOW_HOURS } from '../config/constants';
import type { Band, RunBands } from '../lib/run-bands';
import { SectionPanel } from './section-panel';

/**
 * **가동 ↔ 방류 두 줄** — 이 화면 전용으로 새로 짠다.
 *
 *
 * 두 줄이 어긋난 자리 — 물은 나가는데 방지시설이 멈춘 구간 — 이 이 화면의 두 번째 대조다.
 * 원문이 방법을 그대로 적었다: *"전류 발생 시기와 유량 발생 시기를 비교"* `[원문 발표 p.13]`.
 *
 * **판정은 여기서 하지 않는다.** 무단 여부는 신고 정보가 있어야 정해지고 `[TBD-46]`, 구간
 * 목록·조사는 이상 탐지 화면이 정본이다 — 여기는 «지금 어떻게 생겼는가»만 그리고 링크로 넘긴다.
 */
export function DutyLanes({
  bands,
  observedAtIso,
  anomalyHref,
}: {
  bands: RunBands;
  observedAtIso: string;
  anomalyHref: string;
}) {
  const ticks = WINDOW_HOURS / TICK_HOURS;

  return (
    /*
     * **머리글이 15px 굵은 글자였다** `[사용자 요청 2026-09-10: 아래로 내려갈수록 상세 정보의
     * 성격이 강해지도록]`. 그러면 이 구역의 제목이 바로 위 `물의 양`(12px 작은 대문자)보다
     * 크게 읽혀 **위계가 아래로 갈수록 거꾸로 올라갔다.** 지금은 넷이 같은 머리 띠를 쓴다.
     */
    <SectionPanel
      title="방지시설 가동과 방류"
      aside={
        <span className="text-[12px] text-fg-subtle">빗금은 통신 두절 — 0으로 채우지 않습니다</span>
      }
      bodyClassName="space-y-2 p-5"
    >
      <div className="text-[12px] text-fg-muted">
        {`최근 ${WINDOW_HOURS}시간 · ${COLLECTION_INTERVAL_MINUTES}분 주기 (${DISPLAY_TIMEZONE})`}
      </div>

      {/*
       * **두 줄을 한 틀에 넣는다** `[사용자 요청 2026-09-10: 가동 상태와 방류 시점을 빠르게
       * 이해할 수 있도록 시각적 계층을 개선]`. 띠·판정·상태값은 하나도 바꾸지 않았다 — 두
       * 레인이 여백 위에 떠 있던 것을 hairline 상자로 묶어 «이 둘은 같은 시간축»이 형태로
       * 읽히게 했다(카드·유량 그래프와 같은 틀이라 화면 안에서 어휘가 하나다).
       */}
      <div className="space-y-1.5 rounded-nested border border-border bg-surface-2 px-3 py-2.5">
        <BandRow
          label="가동"
          bands={bands.running}
          missing={bands.missing}
          state="on"
          ticks={ticks}
        />
        <BandRow
          label="방류"
          bands={bands.discharging}
          missing={bands.missing}
          state="on"
          ticks={ticks}
          /* 두 줄이 어긋난 자리만 방류 줄 위에 얹는다 — 가동 줄에도 칠하면 어느 쪽이 문제인지 흐려진다 */
          suspect={bands.suspect}
        />
      </div>

      <div className="flex items-baseline justify-between text-[12px] text-fg-subtle">
        <span>{`${WINDOW_HOURS}시간 전`}</span>
        <span className="num">{`${formatClock(observedAtIso)} ${DISPLAY_TIMEZONE}`}</span>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]">
        {bands.judgeable ? (
          <span className={bands.suspect.length > 0 ? 'text-critical-ink' : 'text-fg-muted'}>
            {bands.suspect.length > 0
              ? `방지시설이 멈춘 채 방류가 이어진 구간 ${bands.suspect.length}건`
              : '두 줄이 어긋난 구간이 없습니다'}
          </span>
        ) : (
          /* 전 구간 결측이면 0건이 아니라 모름이다 — 0건은 «확인했더니 없었다»는 주장이다(E4) */
          <span className="text-fg-subtle">전 구간 수신 없음 — 판정할 수 없습니다</span>
        )}
        <Link
          href={anomalyHref}
          className="inline-flex items-center gap-0.5 text-fg-subtle transition-colors duration-200 hover:text-accent"
        >
          이상 탐지에서 보기
          <ArrowRight aria-hidden size={14} strokeWidth={2} />
        </Link>
      </p>
    </SectionPanel>
  );
}

function BandRow({
  label,
  bands,
  missing,
  state,
  ticks,
  suspect,
}: {
  label: string;
  bands: Band[];
  missing: Band[];
  state: 'on';
  ticks: number;
  suspect?: Band[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[12px] text-fg-muted">{label}</span>

      <div
        className="relative flex-1 overflow-hidden rounded-chip bg-surface"
        style={{ height: BAND_ROW_H_PX, boxShadow: 'var(--track-inset)' }}
      >
        {bands.map((b) => (
          <Segment
            key={`on-${b.fromPct}`}
            band={b}
            style={{ backgroundImage: OPERATING_GRADIENT[state] }}
          />
        ))}

        {/* 모름은 채움이 아니라 질감이다 — 색만으로 가르면 색맹·인쇄·작은 높이에서 붙는다 */}
        {missing.map((b) => (
          <Segment key={`miss-${b.fromPct}`} band={b} style={{ background: MISSING_HATCH }} />
        ))}

        {suspect?.map((b) => (
          <Segment
            key={`sus-${b.fromPct}`}
            band={b}
            style={{ backgroundColor: STATUS_VISUAL.critical.hex }}
          />
        ))}

        {/* 6시간 눈금. 1시간마다 그으면 격자가 되어 «값을 뜻하지 않는 질감»으로 읽힌다 */}
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute inset-y-0 w-px bg-border-strong"
            style={{ left: `${(i / ticks) * 100}%`, opacity: 0.45 }}
          />
        ))}
      </div>
    </div>
  );
}

function Segment({ band, style }: { band: Band; style: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className={cn('absolute inset-y-0')}
      style={{
        left: `${band.fromPct}%`,
        /* 아주 짧은 구간도 한 줄기로는 보이게 한다 — 0폭이면 그 사실이 화면에서 사라진다 */
        width: `max(${band.toPct - band.fromPct}%, ${MIN_BAND_PX}px)`,
        ...style,
      }}
    />
  );
}
