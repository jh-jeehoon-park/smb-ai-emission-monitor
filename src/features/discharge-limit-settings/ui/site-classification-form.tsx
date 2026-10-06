'use client';

import type { ReactNode } from 'react';
import { Building2, Factory, Lock, Recycle, Truck, Waves } from 'lucide-react';
import {
  DISCHARGE_SCALES,
  REGION_GRADES,
  type DischargeScale,
  type RegionGrade,
} from '@/shared/config/discharge-limits';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { BADGE_BASE } from '@/shared/ui/badge';
import { NumberField } from '@/shared/ui/number-field';
import { OptionCard } from '@/shared/ui/option-card';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { SettingRow } from '@/shared/ui/setting-row';
import {
  DISCHARGE_ROUTES,
  DISCHARGE_ROUTE_DESCRIPTIONS,
  DISCHARGE_ROUTE_LABELS,
  type DischargeRoute,
} from '@/entities/regulation';
import { REUSE_STATUS_LABELS, REUSE_STATUSES, type ReuseStatus } from '../config/constants';
import { classificationOf, useLimitSettingsStore } from '../model/limit-settings-context';
import { scaleFromDailyFlow, type SiteClassification } from '../lib/storage';

const UNSET = '미설정';

/** 이 폼을 담는 패널의 제목 옆 툴팁에 쓴다 */
export const SITE_CLASSIFICATION_NOTE = (
  <>
    <strong className="text-fg">그 사업장이 어떤 곳인가</strong>를 적는 칸입니다 — 기준치 자체가
    아니라 <strong className="text-fg">어느 규정이 걸리는지를 정하는 사실관계</strong>입니다.
    값은 <strong className="text-fg">사업장 폐수배출시설 설치허가(신고)증</strong>에서 확인합니다.
    배출량을 넣으면 규모 구간은 거기서 자동으로 정해집니다.
  </>
);

/** 허가량이 아니라 실측 배출량이라 상한을 크게 잡는다 — 1종 사업장도 이 칸을 쓴다 */
const FLOW_RANGE: [number, number] = [0, 100000];

const REUSE_OPTIONS = [
  { value: UNSET, label: UNSET },
  ...REUSE_STATUSES.map((status) => ({ value: status, label: REUSE_STATUS_LABELS[status] })),
];

/**
 * 경로마다 그림 하나 — 다섯 장이 글자만으로 늘어서면 첫 낱말(`공공…`)이 셋이나 같아 훑어지지
 * 않는다. 그림은 **무엇으로 가는가**를 가른다: 물길 · 공공시설 · 공장 · 운반 · 재순환.
 */
const ROUTE_ICON: Record<DischargeRoute, ReactNode> = {
  PUBLIC_WATER: <Waves className="size-4" strokeWidth={1.8} />,
  SEWAGE_TREATMENT: <Building2 className="size-4" strokeWidth={1.8} />,
  WASTEWATER_TREATMENT: <Factory className="size-4" strokeWidth={1.8} />,
  FULL_CONSIGNMENT: <Truck className="size-4" strokeWidth={1.8} />,
  FULL_REUSE: <Recycle className="size-4" strokeWidth={1.8} />,
};

/**
 * 사업장의 **규제 관련 사실관계** — 지역구분 · 1일 폐수배출량 · 방류·처리 경로.
 *
 * **이것이 없으면 기준치표를 고를 수 없다.** 법령 표가 지역구분·규모로 갈리므로
 * `[공정자료 p.11]` 둘 다 정해야 어느 시트를 볼지 결정된다.
 *
 * **우리가 값을 추측하지 않는다.** 실증 사업장 10개소가 전부 `null`인 것은 원문·현장조사에
 * 없기 때문이고(`[TBD-45]`), 여기서 사용자가 고르는 것으로 채운다.
 *
 * **두 묶음으로 가른다** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]` — «어디에 있고
 * 얼마나 내보내는가»(기준표를 고르는 두 축)와 «어디로 내보내는가»(적용되는 법 자체가 갈리는
 * 축). 한 줄로 늘어놓던 판본은 셋째 축이 앞의 둘과 무게가 다르다는 것을 말하지 못했고, 카드
 * 폭 1,100px 중 왼쪽 400px에 조작이 몰려 오른쪽이 비었다.
 */
export function SiteClassificationForm({ siteId }: { siteId: string }) {
  const store = useLimitSettingsStore();
  const current = classificationOf(store, siteId);
  const save = (next: Partial<SiteClassification>) =>
    store.setClassification(siteId, { ...current, ...next });

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${siteId}-where`}>
        <h3 id={`${siteId}-where`} className="mb-2.5 text-[12px] font-semibold text-fg-subtle">
          위치와 규모
        </h3>
        <div className="rounded-nested border border-border px-4 py-4">
          <SettingRow label="지역구분" hint="배출허용기준표의 첫 번째 축">
            <Segments
              label="지역구분"
              options={REGION_GRADES}
              value={current.regionGrade}
              onChange={(next) => save({ regionGrade: next as RegionGrade | null })}
            />
          </SettingRow>

          {/*
           * **구간이 아니라 원시 값을 받는다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
           * 구간 경계는 법이 정하는 것이라 바뀔 수 있다 — 구간만 저장해 두면 경계가 바뀔 때
           * **사업장 데이터를 전부 다시 분류해야 한다.**
           */}
          <SettingRow
            label="1일 폐수배출량"
            hint="허가량이 아니라 실제 배출량. 넣으면 규모 구간이 여기서 정해진다"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                <NumberField
                  label="1일 폐수배출량"
                  hideLabel
                  value={current.dailyWastewaterM3}
                  onChange={(next) =>
                    save({
                      dailyWastewaterM3: next,
                      /* 원시 값이 정본이다 — 지우면 직접 고른 구간으로 되돌아간다 */
                      dischargeScale:
                        next === null ? current.dischargeScale : scaleFromDailyFlow(next),
                    })
                  }
                  unit="㎥/일"
                  decimals={PROVISIONAL_DISPLAY_DECIMALS.dailyWastewaterM3}
                  range={FLOW_RANGE}
                  className="w-[160px]"
                />
                <span aria-hidden className="text-[13px] text-fg-subtle">
                  ㎥/일
                </span>
              </div>
              {current.dailyWastewaterM3 !== null && (
                <span className={`${BADGE_BASE} bg-accent-weak text-accent`}>
                  {scaleFromDailyFlow(current.dailyWastewaterM3)} 구간
                </span>
              )}
            </div>
          </SettingRow>

          {/*
           * **배출량을 알면 구간은 고르는 칸이 아니라 결과다.** 흐리게 잠가 두던 판본은 «눌러도
           * 안 되는 버튼 다섯 개»로 보였다 — 읽기 전용 칸 + 자물쇠로 «자동으로 정해진 값»임을 말한다.
           * 배출량을 **모르는 동안에는** 직접 고른다(지금 10개소가 전부 그 상태다).
           */}
          <SettingRow
            label="배출량 규모"
            hint={
              current.dailyWastewaterM3 === null
                ? '배출량을 모르는 동안 직접 고른다'
                : '배출량에서 자동으로 정해진다'
            }
          >
            {current.dailyWastewaterM3 === null ? (
              <Segments
                label="1일 폐수배출량 규모"
                options={DISCHARGE_SCALES}
                value={current.dischargeScale}
                onChange={(next) => save({ dischargeScale: next as DischargeScale | null })}
              />
            ) : (
              <p className="inline-flex min-h-10 items-center gap-2 rounded-[4px] border border-border bg-surface-2 px-3 text-[13px] text-fg lg:min-h-9">
                <span className="num font-semibold">{current.dischargeScale}</span>
                <Lock
                  aria-label="자동으로 정해진 값"
                  className="size-3.5 text-fg-subtle"
                  strokeWidth={2}
                />
              </p>
            )}
          </SettingRow>
        </div>
      </section>

      {/*
       * **셋째 축이다** `[TBD-45]`. 하천 직접방류는 배출허용기준을, 공공처리시설 유입은
       * 방류수 수질기준을 받는다 — **적용되는 법 자체가 다르다** `[공정자료 p.11]`.
       * 선택지가 다섯에 낱말이 길어 한 줄 세그먼트로는 화면을 넘었고, 무엇을 고르면 무엇이
       * 달라지는지 적을 자리도 없었다 — 카드로 펼치고 뜻을 적는다.
       */}
      <section aria-labelledby={`${siteId}-route`}>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h3 id={`${siteId}-route`} className="text-[12px] font-semibold text-fg-subtle">
            방류·처리 경로
          </h3>
          {current.dischargeRoute ? (
            <button
              type="button"
              onClick={() => save({ dischargeRoute: null })}
              className="inline-flex min-h-10 cursor-pointer items-center text-[12px] text-fg-subtle underline decoration-transparent underline-offset-2 transition-colors duration-200 hover:text-fg hover:decoration-current lg:min-h-0"
            >
              선택 해제
            </button>
          ) : (
            <span className="text-[12px] text-fg-subtle">미설정 · 현장조사에도 없는 값</span>
          )}
        </div>
        <div role="radiogroup" aria-labelledby={`${siteId}-route`} className="@container">
          <div className="grid gap-2 @[34rem]:grid-cols-2 @[56rem]:grid-cols-3">
            {DISCHARGE_ROUTES.map((route) => (
              <OptionCard
                key={route}
                name={`${siteId}-discharge-route`}
                value={route}
                checked={current.dischargeRoute === route}
                onSelect={(value) => save({ dischargeRoute: value as DischargeRoute })}
                title={DISCHARGE_ROUTE_LABELS[route]}
                description={DISCHARGE_ROUTE_DESCRIPTIONS[route]}
                icon={ROUTE_ICON[route]}
              />
            ))}
          </div>
        </div>
      </section>

      {/*
       * **처리수 재이용** `[사용자 결정 2026-09-29: 재이용 (가) — 사실로 받고 표시에 반영]`.
       * 처리한 물 일부를 제조공정에 다시 쓰는 사업장은 유입보다 유출이 늘 적다 — 이 칸이 없으면
       * 화면이 그 차이를 설명하지 못한다. **기준치를 고르는 축은 아니다** — 적용 법은 그대로이고,
       * 유입·유출 화면이 «유입 − 유출»을 읽을 때 쓴다.
       */}
      <section aria-labelledby={`${siteId}-reuse`}>
        <h3 id={`${siteId}-reuse`} className="mb-2.5 text-[12px] font-semibold text-fg-subtle">
          처리수 재이용
        </h3>
        <div className="rounded-nested border border-border px-4 py-4">
          {current.dischargeRoute === 'FULL_REUSE' ? (
            /* 전량 재이용은 경로가 갖는다 — 같은 사실을 두 곳에서 고치지 않게 칸을 걷는다 */
            <p className="text-[12px] leading-relaxed text-fg-subtle">
              방류·처리 경로가 「{DISCHARGE_ROUTE_LABELS.FULL_REUSE}」입니다 — 방류하지 않으므로 일부
              재이용을 따로 적지 않습니다.
            </p>
          ) : (
            <>
              <SettingRow label="재이용" hint="처리수 일부를 방류하지 않고 제조공정에 다시 쓰는가">
                <SegmentedControl
                  className="flex-wrap"
                  ariaLabel="처리수 재이용"
                  value={current.reuse ?? UNSET}
                  onChange={(next) => {
                    const reuse = next === UNSET ? null : (next as ReuseStatus);
                    /* 일부 재이용이 아니면 양도 없다 — 남은 숫자가 재이용이 있는 것처럼 읽힌다 */
                    save({ reuse, reuseDailyM3: reuse === 'partial' ? current.reuseDailyM3 : null });
                  }}
                  options={REUSE_OPTIONS}
                />
              </SettingRow>
              {current.reuse === 'partial' && (
                <SettingRow
                  label="재이용량"
                  hint="일평균. 모르면 비워 둔다 — 유입·유출 화면이 «재이용량 모름»으로 적는다"
                >
                  <div className="flex items-center gap-2">
                    <NumberField
                      label="재이용량"
                      hideLabel
                      value={current.reuseDailyM3}
                      onChange={(next) => save({ reuseDailyM3: next })}
                      unit="㎥/일"
                      decimals={PROVISIONAL_DISPLAY_DECIMALS.dailyWastewaterM3}
                      range={FLOW_RANGE}
                      className="w-[160px]"
                    />
                    <span aria-hidden className="text-[13px] text-fg-subtle">
                      ㎥/일
                    </span>
                  </div>
                </SettingRow>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * 한 축. **`미설정`을 선택지로 둔다** — 잘못 고른 것을 되돌릴 방법이 없으면 한 번 고른 뒤
 * 되돌릴 수 없고, 그 상태가 "확정"으로 읽힌다.
 */
function Segments({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <SegmentedControl
      className="flex-wrap"
      ariaLabel={label}
      value={value ?? UNSET}
      onChange={(next) => onChange(next === UNSET ? null : next)}
      options={[
        { value: UNSET, label: UNSET },
        ...options.map((option) => ({ value: option, label: option })),
      ]}
    />
  );
}
