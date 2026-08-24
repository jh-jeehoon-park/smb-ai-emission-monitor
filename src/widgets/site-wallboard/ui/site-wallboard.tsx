'use client';

import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import { VALUE_LG } from '@/shared/ui/type-scale';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import type { Site } from '@/entities/site';

interface SiteWallboardProps {
  sites: Site[];
  /** 알람 수는 alarm slice 소관이라 Site가 들고 있지 않다. 위젯에서 합친다 */
  alarmCounts: Record<string, number>;
  /** 카드를 누르면 그 사업장의 미확인 알람을 연다 */
  onOpenAlarms: (id: string) => void;
}

/**
 * 다사업장 통합 관제(FR-31~33)를 한 줄로 압축한 화면 요소다.
 * 관제실 월보드처럼 전체를 훑고 이상한 곳으로 바로 들어가는 것이 목적이다.
 *
 * **선택 도구가 아니다** `[사용자 지시 2026-08-24]`. 아래 상세가 어느 사업장의 것인지는
 * 지도 머리의 사업장 탭이 정하고, 이 카드는 누르면 **미확인 알람**을 연다 —
 * 훑는 일과 고르는 일을 한 요소에 겹쳐 두면 카드를 눌렀을 때 무엇이 일어날지 알 수 없다.
 * 그래서 선택 표시(테두리·면 강조)도 두지 않는다.
 */
export function SiteWallboard({ sites, alarmCounts, onOpenAlarms }: SiteWallboardProps) {
  /* 열 수는 뷰포트가 아니라 이 목록이 받은 폭을 따른다 — 지도 레일이 넓어지면 알아서 줄어든다 */
  return (
    <div className="@container">
      <StaggerGroup className="grid grid-cols-2 gap-3 @[520px]:grid-cols-3 @[860px]:grid-cols-5">
        {sites.map((site) => {
          const visual = site.status ? STATUS_VISUAL[site.status] : null;
          const open = alarmCounts[site.id] ?? 0;

          return (
            <RiseItem key={site.id}>
              <button
                type="button"
                onClick={() => onOpenAlarms(site.id)}
                aria-haspopup="dialog"
                aria-label={`${site.name} 미확인 알람 ${open}건 보기`}
                className={cn(
                  'flex h-full w-full cursor-pointer flex-col gap-3 rounded-nested border bg-surface p-4 text-left',
                  'transition-colors duration-200',
                  'border-border hover:border-border-strong hover:bg-surface-2',
                )}
              >
                {/*
                 * 두 줄로 줄인다 `[사용자 지시 2026-08-24]`. 업종·지역은 지웠다 — 카드를
                 * 훑는 목적은 **어디가 위험한가**이고 그 답은 점수·등급·알람이다.
                 * 업종·지역은 지도 핀 툴팁과 알람 모달이 갖고 있다.
                 */}
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-[14px] font-bold leading-tight text-fg">
                    {site.name}
                  </p>
                  <p
                    className={`num shrink-0 ${VALUE_LG}`}
                    style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
                  >
                    {site.anomalyScore ?? '—'}
                  </p>
                </div>

                {/*
                 * 알람은 왼쪽, 등급은 오른쪽 — 위 줄의 이름·점수와 같은 축이라 두 줄이
                 * 한 표처럼 읽힌다. 좁아지면 등급이 아래로 내려간다(`flex-wrap`).
                 */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p className="text-[12px] text-fg-subtle">
                    미확인 알람 <span className="num font-bold text-fg">{open}</span>건
                  </p>
                  {/*
                   * 통신 두절은 등급이 아니라 **수신 상태**라 등급색을 쓰지 않고 중립면에 둔다 —
                   * 회색 뱃지를 등급 팔레트에 넣으면 `정상`과 같은 축으로 읽힌다.
                   */}
                  {site.status ? (
                    <StatusBadge level={site.status} />
                  ) : (
                    <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>통신 두절</span>
                  )}
                </div>
              </button>
            </RiseItem>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
