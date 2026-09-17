'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW, TABLE_SCROLL } from '@/shared/ui/table';
import type { SupervisionRow } from '../lib/supervision-rows';

/**
 * **판정할 수 없었다는 사실을 그대로 적는다.**
 *
 * `—`나 `0`으로 적으면 *"확인했더니 없었다"* 로 읽힌다. 두절된 사업장은 확인되지 않았을
 * 뿐이고, 감독자가 그것을 깨끗함으로 읽으면 판단이 거짓 근거 위에 선다(**E4**).
 */
const UNJUDGED = '판정 불가';

function CountCell({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) {
    return <span className="text-fg-subtle">{UNJUDGED}</span>;
  }
  return (
    <span className={value > 0 ? 'num font-semibold text-critical-ink' : 'num text-fg-muted'}>
      {value}
      {unit}
    </span>
  );
}

interface SupervisionTableProps {
  rows: SupervisionRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** 그 사업장의 상세 화면 주소. 선택과 **다른 일**이라 따로 받는다 */
  detailHref: (siteId: string) => string;
}

/**
 * 관내 사업장 × 감독 지표.
 *
 * **카드 옆에 표를 두는 이유** — 감독자는 카드를 훑는 게 아니라 **줄 세워 비교**한다.
 * 월보드가 훑기이고 이 표가 비교라, 둘이 같은 `관내 전체` 축의 두 면이라서 한 판에 든다.
 *
 * 정렬은 `조치 필요한 순`이다(`buildSupervisionRows`) — 이상 점수 순이 아니다.
 */
export function SupervisionTable({
  rows,
  selectedId,
  onSelect,
  detailHref,
}: SupervisionTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-[12px] text-fg-subtle">
        이 관할에 등록된 사업장이 없습니다 — <strong className="text-fg-muted">0개소는 오류가
        아닙니다.</strong> 전국 243개 시·군·구 중 대부분이 그렇습니다.
      </p>
    );
  }

  return (
    <div className={TABLE_SCROLL}>
      <table className={`${TABLE_ROOT} min-w-[720px] table-fixed text-center text-[12px]`}>
        <caption className="sr-only">
          관내 사업장 감독 현황 — 조치 필요한 순(두절 · 등급 높은 순 · 미확인 많은 순)
        </caption>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th scope="col" className={`text-left ${TABLE_HEAD_CELL}`}>
              사업장
            </th>
            <th scope="col" className={`w-[92px] ${TABLE_HEAD_CELL}`}>
              업종
            </th>
            <th scope="col" className={`w-[120px] ${TABLE_HEAD_CELL}`}>
              상태
            </th>
            <th scope="col" className={`w-[104px] ${TABLE_HEAD_CELL}`}>
              기준 초과
            </th>
            <th scope="col" className={`w-[104px] ${TABLE_HEAD_CELL}`}>
              방류 의심
            </th>
            <th scope="col" className={`w-[84px] ${TABLE_HEAD_CELL}`}>
              미확인
            </th>
            <th scope="col" className={`w-[76px] ${TABLE_HEAD_CELL}`}>
              <span className="sr-only">상세</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.site.id}
              onClick={() => onSelect(row.site.id)}
              className={cn(
                TABLE_ROW,
                'cursor-pointer transition-colors duration-150 hover:bg-surface-2',
                row.site.id === selectedId && 'bg-surface-2',
              )}
            >
              <td className="px-3 py-3.5 text-left">
                <span className="font-semibold text-fg">{row.site.name}</span>
              </td>
              <td className="px-3 py-3.5 text-fg-muted">{row.site.industry}</td>
              <td className="px-3 py-3.5">
                {/* 두절이면 등급이 없다. 점수 자리에 0을 넣지 않는다(E4) */}
                {row.status === null ? (
                  <span className="text-fg-subtle">수신 없음</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge level={row.status} />
                    <span className="num text-fg-muted">{row.anomalyScore}</span>
                  </span>
                )}
              </td>
              <td className="px-3 py-3.5">
                <CountCell value={row.overLimit} unit="건" />
              </td>
              <td className="px-3 py-3.5">
                <CountCell value={row.idleRuns} unit="구간" />
              </td>
              <td className="px-3 py-3.5">
                <CountCell value={row.openAlarms} unit="건" />
              </td>
              <td className="px-3 py-3.5">
                {/*
                 * **이 버튼만 화면을 옮긴다** `[사용자 요청 2026-08-28]`. 줄·카드·탭·핀 넷은
                 * 그대로 선택이다.
                 *
                 * 한때 다섯이 같은 일(선택)을 하면서 이것만 `상세 보기`라 부르고 화살표까지
                 * 달고 있었다 — **라벨이 하는 말과 동작이 어긋나 있었다.** 이름을 고치는 대신
                 * 동작을 이름에 맞췄다.
                 *
                 * **`stopPropagation`이 있어야 이동한다.** 줄의 `onClick`이 함께 돌면
                 * `setSiteId`가 `history.replaceState`로 주소를 덮어써 링크 이동이 지워진다 —
                 * 실제로 그렇게 눌러도 표에 그대로 남았다. 기본 동작(이동)은 막지 않는다.
                 */}
                <Link
                  href={detailHref(row.site.id)}
                  onClick={(event) => event.stopPropagation()}
                  className={ACTION_BUTTON_QUIET}
                  aria-label={`${row.site.name} 사업장 상세로 이동`}
                >
                  상세
                  <ChevronRight aria-hidden size={13} strokeWidth={2} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
