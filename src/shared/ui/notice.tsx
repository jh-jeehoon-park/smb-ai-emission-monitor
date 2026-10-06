import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 안내·오류를 말하는 블록 `[사용자 요청 2026-09-15]`.
 *
 * **색은 중립이다.** 상태색(정상·주의·경고·위험)을 빌리지 않는다 — 그것은 계측 판정의 등급이라
 * 붉은 404를 «위험 등급»으로 읽게 만든다(**E2**). 포인트색은 아래 버튼(조작)에만 쓴다(§8).
 *
 * **아이콘을 넣지 않는다.** 이 저장소에 경고·차단 계열 글리프의 전례가 없고, 숫자 코드와 한 줄
 * 제목이 이미 무슨 일인지 말한다. 새 기호를 들이면 그 뜻을 어디선가 또 정의해야 한다.
 *
 * 짜임은 `anomaly-panel`의 빈 상태를 따른다 — **큰 글자 · 짧은 제목 · 좁은 설명 문단**.
 * 설명을 46자에서 접는 것은 한 줄이 눈을 가로지르지 않게 하려는 것이고, 그 화면이 이미 쓰는 값이다.
 *
 * `widgets/`가 아니라 여기 있는 이유 — **소비처의 층이 갈린다.** `Notice`는 `app` 층의 오류
 * 페이지 셋(`not-found`·`/403`·`/500`)이 쓰고 `NoticeBar`는 셸(위젯)이 쓴다. 도메인 지식이
 * 0인 표현 부품이라 `shared`가 제자리이기도 하다 — `Panel`·`StatTile`과 같은 자리다.
 *
 * (한때 근거를 *"403을 그리는 것이 `AppShell`이라 위젯에 두면 widget → widget import가 된다"*
 * 로 적었다. **403이 페이지가 되면서 그 이유는 사라졌고**, 그 import 자체도 이 저장소가 이미
 * 여러 곳에서 하고 있다 — 배치의 근거는 지금 «층이 갈린다» 하나다.)
 */
export function Notice({
  code,
  title,
  description,
  actions,
  footnote,
  className,
}: {
  /** `404`·`403`·`500`. 글자가 아니라 숫자라 번역이 필요 없고 사용자가 그대로 전달할 수 있다 */
  code: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** 오류 번호처럼 **알려 줄 때만 쓰는** 한 줄. 본문보다 한 단 더 물러난다 */
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {/*
       * 코드가 가장 큽니다 — 무슨 일인지를 한 낱말로 말하는 자리다. `num`은 숫자를
       * 표 눈금에 맞추는 기존 클래스이고, 여기서도 자릿수가 흔들리지 않게 한다.
       */}
      <p className="num text-[44px] font-bold leading-none tracking-tight text-fg-subtle">{code}</p>

      <h2 className="text-[18px] font-bold leading-tight text-fg">{title}</h2>

      <p className="max-w-[46ch] text-[13px] leading-relaxed text-fg-muted">{description}</p>

      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>}

      {footnote && <p className="mt-1 text-[12px] text-fg-subtle">{footnote}</p>}
    </div>
  );
}

/**
 * 화면 위에 한 줄로 얹는 고지 띠 `[사용자 결정 2026-09-15]`.
 *
 * **패널마다 붙이지 않는 이유가 있다.** 패널의 `action` 자리는 `상세 보기`·필터가 이미 쓰고
 * 있어 충돌하고, 한 화면에 패널이 열 개를 넘으므로 같은 말이 열 번 반복되면 아무도 읽지 않는다.
 * 셸의 화면명 바로 아래 **화면당 하나**를 둔다 — `TopButton`이 *"셸에 한 번만 두면 모든 화면이
 * 함께 얻는다"* 고 적은 그 자리다.
 *
 * **면은 중립이다.** 여기 뜨는 말은 «지금 보는 값이 어디서 왔는가»이지 계측 판정이 아니다 —
 * 경고색을 깔면 화면의 숫자가 나쁜 값이라는 뜻으로 읽힌다.
 */
export function NoticeBar({
  message,
  action,
  className,
}: {
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      /* 값이 바뀌는 것이 아니라 상태가 바뀌는 자리라 읽어 주기는 `polite`다 */
      role="status"
      /* `SkeletonRegion`도 `role="status"`라 역할만으로는 이 띠를 집을 수 없다 — 검사와 실측이 가릴 표식 */
      data-notice-bar
      className={cn(
        'mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-nested border border-border bg-surface-2 px-3 py-2 lg:mb-5',
        className,
      )}
    >
      <p className="min-w-0 text-[12px] leading-relaxed text-fg-muted">{message}</p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
