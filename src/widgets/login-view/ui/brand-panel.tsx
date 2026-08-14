import { Waves } from 'lucide-react';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { GRID_PITCH_PX, PLATFORM_HIGHLIGHTS, SIGNAL_POINTS } from '../config/brand-panel';

/**
 * 로그인 좌측 패널. 계측 화면의 성격(눈금·파형)을 배경으로만 암시하고
 * 상태색은 쓰지 않는다 — 이 시스템에서 색은 곧 상태라 로그인에 쓰면 뜻이 흐려진다.
 */
export function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:p-12">
      <GridBackdrop />
      <SignalBackdrop />

      <div className="relative flex flex-1 flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[6px] bg-normal/12 text-normal">
            <Waves size={19} strokeWidth={2.2} />
          </span>
          <Eyebrow>비TMS 소규모 사업장</Eyebrow>
        </div>

        <h1 className="mt-8 max-w-[13ch] break-keep text-[40px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
          {/* 사업계획서 p.37·p.118의 국문 정식명. 줄여 쓰지 않는다(A2) */}
          AI 기반 지능형 배출관리 플랫폼
        </h1>
        <p className="mt-4 max-w-[34ch] break-keep text-[14px] leading-relaxed text-fg-muted">
          {/* AI 산출 4종을 줄여 적지 않는다 — 하나를 빼면 범위가 달라 보인다(A2) */}
          현장 센서와 ECP가 모은 수질·설비 시계열을 Cloud AI가 읽고, 이상 탐지 · 수질 예측 ·
          오염도 추정 · 설비 예지보전 결과를 한 화면으로 돌려줍니다.
        </p>

        <dl className="mt-10 grid max-w-[520px] grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-border bg-border">
          {PLATFORM_HIGHLIGHTS.map((item) => (
            <div key={item.label} className="bg-surface px-4 py-3.5">
              <dt className="text-[11px] text-fg-subtle">{item.label}</dt>
              <dd className="num mt-1 text-[15px] font-semibold tracking-tight text-fg">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
        backgroundSize: `${GRID_PITCH_PX}px ${GRID_PITCH_PX}px`,
        /* 격자가 화면 끝까지 살아 있으면 표처럼 읽힌다. 가장자리로 갈수록 지운다 */
        maskImage: 'radial-gradient(110% 80% at 12% 22%, #000 0%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(110% 80% at 12% 22%, #000 0%, transparent 72%)',
      }}
    />
  );
}

function SignalBackdrop() {
  const step = 100 / (SIGNAL_POINTS.length - 1);
  const points = SIGNAL_POINTS.map((v, i) => `${(i * step).toFixed(2)},${(100 - v).toFixed(2)}`).join(
    ' ',
  );

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full text-border-strong"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.45}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.45}
        strokeDasharray="3 5"
        vectorEffect="non-scaling-stroke"
        transform="translate(0 9)"
        opacity={0.55}
      />
    </svg>
  );
}
