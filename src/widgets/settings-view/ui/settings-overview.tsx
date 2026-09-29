import { Check, Factory } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';

export interface ReadinessStep {
  label: string;
  /** 채운 값. `null`이면 아직 비었다 */
  value: string | null;
}

/**
 * **이 사업장의 판정이 어디까지 준비됐는가** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 예전 요약 카드는 `지역구분 · 미설정 / 배출량 규모 · 미설정 / …` 다섯 칸을 같은 무게로 늘어놓은
 * 표였다 — 무엇이 비었는지는 보여도 **그것이 무엇을 막고 있는지**는 말하지 않았다. 네 칸은
 * 순서가 있는 준비 단계다: 지역구분과 배출량 규모가 있어야 기준표를 고르고, 방류 경로가 있어야
 * 어느 법이 걸리는지 알고, 기준치가 들어가야 법정 판정을 한다. 그래서 **단계로 세운다.**
 *
 * **지금 무엇으로 판정하고 있는가**를 함께 적는다 — 법정 기준(pH)과 시연 임계값(TOC·T-N·T-P)이
 * 섞여 있다는 사실이 이 화면 밖의 모든 판정 문구를 설명한다.
 *
 * 완료 표시는 **중립 잉크**다. 초록은 계측 등급 `정상`이고(§8 `상태색`) 포인트색은 조작·선택에만
 * 쓴다(§8 `포인트색`) — 「준비됐다」는 둘 다 아니다.
 */
export function SettingsOverview({
  siteName,
  siteRegion,
  steps,
  legalCodes,
  provisionalCodes,
  nextAction,
}: {
  siteName: string;
  siteRegion: string;
  steps: readonly ReadinessStep[];
  legalCodes: readonly string[];
  provisionalCodes: readonly string[];
  /** 다음에 할 일 — 판정이 아직 열리지 않은 이유. 다 됐으면 `null` */
  nextAction: string | null;
}) {
  const done = steps.filter((step) => step.value !== null).length;

  return (
    <section
      aria-label="판정 준비 현황"
      className="rounded-panel border border-card-border bg-surface p-4 shadow-panel lg:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-nested bg-accent-weak text-accent"
          >
            <Factory className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-fg">{siteName}</p>
            <p className="mt-0.5 truncate text-[12px] text-fg-subtle">{siteRegion}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
          <p className="text-fg-subtle">
            법정 판정{' '}
            <span className="font-semibold text-fg">
              {legalCodes.length > 0 ? legalCodes.join(' · ') : '없음'}
            </span>
          </p>
          <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
          <p className="text-fg-subtle">
            시연 임계{' '}
            <span className="font-semibold text-caution-ink">
              {provisionalCodes.length > 0 ? provisionalCodes.join(' · ') : '없음'}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-semibold text-fg-subtle">판정 준비</p>
          <p className="text-[12px] text-fg-subtle">
            <span className="num text-[14px] font-bold text-fg">{done}</span> / {steps.length}
          </p>
        </div>

        {/* 번호가 순서를 말한다 — 앞 칸이 비면 뒤 칸을 채워도 판정이 열리지 않는다. 좁으면 두 칸씩 */}
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const filled = step.value !== null;
            return (
              <li
                key={step.label}
                className={cn(
                  'flex min-w-0 items-center gap-2.5 rounded-nested border px-3 py-2.5',
                  filled ? 'border-border bg-surface' : 'border-dashed border-border-strong bg-surface-2',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'num grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold',
                    filled ? 'bg-fg text-surface' : 'border border-dashed border-border-strong text-fg-subtle',
                  )}
                >
                  {filled ? <Check className="size-3.5" strokeWidth={2.8} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-fg-subtle">{step.label}</span>
                  {filled ? (
                    <span className="block truncate text-[13px] font-semibold text-fg">{step.value}</span>
                  ) : (
                    <span className={cn(BADGE_BASE, 'mt-0.5 bg-surface-3 text-fg-subtle')}>미설정</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {/* 비어 있다는 사실만으로는 무엇부터 할지 모른다 — 막고 있는 것 하나를 적는다 */}
        {nextAction && (
          <p className="mt-3 text-[12px] leading-relaxed text-fg-subtle">
            <span className="font-semibold text-fg-muted">다음 할 일</span> · {nextAction}
          </p>
        )}
      </div>
    </section>
  );
}
