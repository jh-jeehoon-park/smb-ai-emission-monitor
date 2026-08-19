'use client';

import { useMemo } from 'react';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { DISPLAY_TIMEZONE, formatDate } from '@/shared/lib/format';
import { useQueryState } from '@/shared/lib/use-query-state';
import { cn } from '@/shared/lib/cn';
import { Panel } from '@/shared/ui/panel';
import { getSite } from '@/entities/site';
import {
  ANALYSIS_ITEMS,
  ANALYSIS_SOURCE_CYCLES,
  ANALYSIS_SOURCE_LABELS,
  buildComparison,
  computeMetrics,
  getAnalysisRounds,
  getEstimated,
  hasAnalyzer,
  hasEstimation,
  measuredMean,
  type AnalysisItemCode,
  type AnalysisRound,
  type ComparisonRow,
} from '@/entities/water-analysis';
import { useSelectedSiteId } from '@/features/site-selection';
import { METRIC_ITEM_CODES, ROUND_QUERY_KEY } from '../config/constants';

/**
 * 수분석 실측 대비 AI 추정 검증 (SCR-OP-009).
 *
 * 원문이 검증 방법으로 **"월 2회 수분석 대비 AI 예측값 비교"** 를 지정하고 지표를 R²·MAE로
 * 정한다 `[원문 p.38]`. 발표자료는 여기에 **대표 실증사업장 1개소의 TN/TP 분석기** 연계 검증을
 * 더한다 `[원문 발표 p.17]`.
 *
 * **AI 추정은 자가측정을 대체하지 않는다** `[공정자료 p.13·14]`. 이 화면이 그 사실을 적지
 * 않으면 "AI가 있으니 분석을 줄여도 된다"로 읽힌다 — 법적으로 틀린 이해다.
 */
export function ValidationView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);
  const rounds = useMemo(() => getAnalysisRounds(siteId), [siteId]);
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds]);
  const [roundId, setRoundId] = useQueryState(ROUND_QUERY_KEY, roundIds, roundIds[0]!);

  const selected = rounds.find((r) => r.id === roundId) ?? rounds[0]!;
  const online = hasEstimation(siteId);

  const comparison = useMemo(
    () => buildComparison(selected, (code) => getEstimated(selected, code)),
    [selected],
  );

  /**
   * 지표는 **항목별로, 회차를 가로질러** 계산한다.
   *
   * 세 항목을 한 데 모으면 안 된다 — TOC 25 · TN 16 · TP 1.5로 크기가 달라, 항목 간 차이가
   * 총제곱합을 채워 R²가 실제보다 훨씬 높게 나온다(모아서 계산하니 0.99가 나왔다).
   * 한 회차 안의 평균 하나로도 성립하지 않으므로 회차를 가로지른다.
   */
  const metrics = useMemo(
    () =>
      METRIC_ITEM_CODES.map((code) => {
        const pairs = rounds.flatMap((round) => {
          const measured = measuredMean(round, code);
          const estimated = getEstimated(round, code);
          return measured === null || estimated === null ? [] : [{ measured, estimated }];
        });
        return { code, ...computeMetrics(pairs) };
      }),
    [rounds],
  );

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${ANALYSIS_SOURCE_LABELS.lab} · ${site.name}`}
        title="수분석 실측 대비 AI 추정 검증"
        action={<span className="text-[12px] text-fg-subtle">{ANALYSIS_SOURCE_CYCLES.lab}</span>}
      >
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <RoundList rounds={rounds} selectedId={selected.id} onSelect={setRoundId} />

          <div className="min-w-0">
            <RoundHeader round={selected} />
            <ComparisonTable rows={comparison} online={online} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel eyebrow="검증 지표 · 항목별" title="R² · MAE">
          <Metrics rows={metrics} />
        </Panel>

        <Panel eyebrow={ANALYSIS_SOURCE_LABELS.analyzer} title="분석기 연계 검증">
          <AnalyzerNote siteId={siteId} siteName={site.name} />
        </Panel>
      </div>

      <Panel eyebrow="법적 관계" title="AI 추정은 자가측정을 대체하지 않는다">
        <p className="max-w-[86ch] text-[12px] leading-relaxed text-fg-muted">
          TMS는 <strong className="text-fg">측정되는 항목만</strong> 자가측정을 대체하며, BOD·중금속·
          특정수질유해물질·대장균군은 TMS 사업장도 자가측정 의무가 그대로 유지된다 [공정자료 p.13·14].
          우리 대상은 비TMS 사업장이라 <strong className="text-fg">대체 관계 자체가 성립하지 않는다</strong>
          — 이 화면의 대조는 AI 추정의 정확도를 확인하기 위한 것이지 법정 측정을 갈음하는 것이 아니다.
          법적 기준 적용은 TMS 유무와 무관하다 [공정자료 p.12].
        </p>
      </Panel>
    </div>
  );
}

function RoundList({
  rounds,
  selectedId,
  onSelect,
}: {
  rounds: AnalysisRound[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
      {rounds.map((round) => (
        <li key={round.id}>
          <button
            type="button"
            onClick={() => onSelect(round.id)}
            aria-pressed={round.id === selectedId}
            className={cn(
              'w-full cursor-pointer rounded-[4px] border px-2.5 py-2 text-left transition-colors duration-200',
              round.id === selectedId
                ? 'border-border-strong bg-surface-2'
                : 'border-transparent hover:border-border hover:bg-surface-2/60',
            )}
          >
            <p className="num text-[12px] text-fg">{formatDate(round.receivedIso)}</p>
            <p className="num mt-0.5 text-[11px] text-fg-subtle">{round.issueNo}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RoundHeader({ round }: { round: AnalysisRound }) {
  return (
    <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-4">
      <Meta label="발급번호" value={round.issueNo} mono />
      <Meta label="접수일" value={`${formatDate(round.receivedIso)} ${DISPLAY_TIMEZONE}`} mono />
      <Meta label="분석 기관" value={round.lab} />
      <Meta label="시료 수" value={`${round.samples.length}건 (시각별)`} mono />
    </dl>
  );
}

function ComparisonTable({ rows, online }: { rows: ComparisonRow[]; online: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-[12px]">
        <caption className="sr-only">회차별 실측값과 AI 추정값 대조</caption>
        <thead>
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th className="py-2 pr-3 text-left font-normal">항목</th>
            <th className="px-3 py-2 text-right font-normal">실측(수분석)</th>
            <th className="px-3 py-2 text-right font-normal">AI 추정</th>
            <th className="px-3 py-2 text-right font-normal">오차</th>
            <th className="py-2 pl-3 text-left font-normal">비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const item = ANALYSIS_ITEMS[row.code];
            return (
              <tr key={row.code} className="border-b border-border last:border-0">
                <td className="py-2 pr-3">
                  <span className="font-semibold text-fg">{row.code}</span>
                  <span className="ml-1.5 text-[11px] text-fg-subtle">{item.label}</span>
                </td>
                <td className="num px-3 py-2 text-right text-fg">
                  {show(row.measured, row.code)}
                </td>
                <td className="num px-3 py-2 text-right text-fg-muted">
                  {show(row.estimated, row.code)}
                </td>
                <td className="num px-3 py-2 text-right text-fg-muted">
                  {row.error === null ? '—' : signed(row.error, row.code)}
                </td>
                <td className="py-2 pl-3 text-[11px] leading-snug text-fg-subtle">
                  {row.unavailableReason ??
                    (row.estimated === null && !online ? '통신 두절로 AI 산출 중단' : '')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Metrics({
  rows,
}: {
  rows: (ReturnType<typeof computeMetrics> & { code: AnalysisItemCode })[];
}) {
  return (
    <div>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th className="py-2 pr-3 text-left font-normal">항목</th>
            <th className="px-3 py-2 text-right font-normal">결정계수 R²</th>
            <th className="px-3 py-2 text-right font-normal">MAE (mg/L)</th>
            <th className="py-2 pl-3 text-right font-normal">표본</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 text-fg">{row.code}</td>
              <td className="num px-3 py-2 text-right text-fg">
                {figure(row.r2, PROVISIONAL_DISPLAY_DECIMALS.validationR2)}
              </td>
              <td className="num px-3 py-2 text-right text-fg-muted">
                {figure(row.mae, PROVISIONAL_DISPLAY_DECIMALS.validationMae)}
              </td>
              <td className="num py-2 pl-3 text-right text-fg-subtle">{row.sampleCount}쌍</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 max-w-[70ch] border-t border-border pt-3 text-[11px] leading-relaxed text-fg-subtle">
        지표 두 가지는 원문이 지정한 것이다 — 오염도 추정 정확도 검증(R²·MAE 기반) [원문 p.38].{' '}
        <strong className="text-fg-muted">항목을 한 데 모아 계산하지 않는다</strong> — TOC 25 · TN
        16 · TP 1.5로 크기가 달라 모으면 항목 간 차이가 R²를 실제보다 높게 만든다. SS·COD는 AI 추정
        대상이 아니라 제외된다.
      </p>
    </div>
  );
}

function figure(value: number | null, decimals: number): string {
  return value === null ? '—' : value.toFixed(decimals);
}

function AnalyzerNote({ siteId, siteName }: { siteId: string; siteName: string }) {
  if (!hasAnalyzer(siteId)) {
    return (
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        <strong className="text-fg-muted">{siteName}은 분석기 설치 대상이 아닙니다.</strong>{' '}
        TN/TP 분석기는 대표 실증사업장 <strong className="text-fg-muted">1개소</strong>에만 설치된다
        [원문 발표 p.17]. 이 사업장의 검증은 위탁 실험실 수분석으로만 이뤄진다.
      </p>
    );
  }

  return (
    <p className="text-[12px] leading-relaxed text-fg-muted">
      <strong className="text-fg">대표 실증사업장</strong>이다. TN/TP 분석기가 설치돼 연속 측정값과
      AI 추정을 상시 대조한다 [원문 발표 p.17].{' '}
      <span className="text-fg-subtle">
        어느 사업장을 대표로 할지는 원문이 정하지 않아 시연에서 골랐다.
      </span>
    </p>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={mono ? 'num mt-0.5 text-fg-muted' : 'mt-0.5 text-fg-muted'}>{value}</dd>
    </div>
  );
}

function show(value: number | null, code: AnalysisItemCode): string {
  return value === null ? '—' : value.toFixed(ANALYSIS_ITEMS[code].decimals);
}

/** 오차는 부호가 정보다 — AI가 높게 봤는지 낮게 봤는지가 보정 방향을 정한다 */
function signed(value: number, code: AnalysisItemCode): string {
  const text = Math.abs(value).toFixed(ANALYSIS_ITEMS[code].decimals);
  if (value === 0) return text;
  return `${value > 0 ? '+' : '−'}${text}`;
}
