'use client';

import { usePathname } from 'next/navigation';
import {
  NOTICE_RETRYING_LABEL,
  NOTICE_RETRY_LABEL,
  TELEMETRY_FALLBACK_NOTICES,
  unreceivedNotice,
} from '@/shared/config/notices';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { NoticeBar } from '@/shared/ui/notice';
import { useRetryTelemetry, useSiteSeries } from '@/entities/measurement';
import { useSelectedSiteId } from '@/features/site-selection';
import { readsTelemetry } from '../config/navigation';

/**
 * 계측을 못 받았다는 사실을 **값이 놓인 화면 안에서** 말한다 `[사용자 결정 2026-09-15]`.
 *
 * 폴백 자체는 그대로다 `[사용자 결정 2026-08-27]` — 내장 데이터로 시연이 이어진다. 바뀌는 것은
 * **그 사실을 어디서 말하는가**다. 지금까지는 헤더 우측 12px 배지 하나뿐이라, 차트를 읽는
 * 사람은 그 값이 내장 데이터인 줄 모르고 읽었다. 2026-09-15에 반나절 그렇게 돌았다.
 *
 * **셸에 한 번만 둔다.** 패널마다 붙이면 ① `Panel`의 `action` 자리를 `상세 보기`·필터가 이미
 * 쓰고 있어 충돌하고 ② 한 화면의 패널이 열 개를 넘어 같은 말이 열 번 반복되면 아무도 읽지
 * 않는다. `TopButton`이 *"셸에 한 번만 두면 모든 화면이 함께 얻는다"* 고 적은 그 자리다.
 *
 * **계측을 쓰지 않는 도메인은 저절로 빠진다.** 알람·이상 점수·예측·설비·공정은 애초에 API가
 * 없는 fixture라 «실패»가 아니다 — 거기에 같은 표기를 붙이면 없는 장애를 주장하게 된다.
 * 셸 한 곳에서 계측 상태만 보므로 그 구분을 따로 지킬 일이 없다.
 */
export function TelemetryNotice() {
  const pathname = usePathname();
  const { siteId } = useSelectedSiteId();
  const { status, failure, unreceived } = useSiteSeries(siteId);
  const { retry, retrying } = useRetryTelemetry();

  const notice = readsTelemetry(pathname) ? describe(status, failure, unreceived.length) : null;
  if (!notice) return null;

  return (
    <NoticeBar
      message={notice.message}
      action={
        notice.retry ? (
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className={ACTION_BUTTON_QUIET}
          >
            {retrying ? NOTICE_RETRYING_LABEL : NOTICE_RETRY_LABEL}
          </button>
        ) : null
      }
    />
  );
}

/**
 * 무엇을 말할지. **아무 말도 하지 않는 경우가 셋**이고 그것이 규약의 핵심이다.
 *
 * | 상태 | 왜 침묵하는가 |
 * |---|---|
 * | `live`이고 다 받았다 | 정상이다. 여기서 화면이 달라지면 요청하지 않은 변경이다(**A2**) |
 * | `pending` | 아직 **묻지 않았다.** 그것을 «못 받았다»로 적으면 없는 부재를 주장한다(**E4**) — 스켈레톤이 이미 말한다 |
 * | `unconfigured` | 접속 정보를 두지 않은 것은 **오류가 아니다.** 사내망 주소라 배포본은 상시 이 상태이고, 띠가 늘 떠 있으면 진짜 두절이 그 안에 묻힌다 |
 */
function describe(
  status: ReturnType<typeof useSiteSeries>['status'],
  failure: ReturnType<typeof useSiteSeries>['failure'],
  unreceivedCount: number,
): { message: string; retry: boolean } | null {
  if (status === 'pending') return null;

  if (status === 'fallback') {
    if (!failure || failure === 'unconfigured') return null;
    return TELEMETRY_FALLBACK_NOTICES[failure];
  }

  /*
   * **접속은 됐는데 일부 계열이 한 점도 오지 않는 경우.** 2026-09-15에 실제로 겪었다 —
   * 에뮬레이터가 채널 이름을 바꿨는데(`pH` → `pHOut`) 없는 키는 오류가 아니라 빈 배열이라
   * 헤더는 `계측 서버 수신 중`인데 수질 8종이 전부 비었다. 그 조합을 화면이 말하지 못해
   * 진단이 반나절 늦었다. `fallback`일 때는 `unreceived`가 늘 비어 있어 두 띠가 겹치지 않는다.
   */
  if (unreceivedCount > 0) {
    return { message: unreceivedNotice(unreceivedCount), retry: true };
  }

  return null;
}
