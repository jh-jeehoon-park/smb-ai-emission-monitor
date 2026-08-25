'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { DEMO_ACCOUNT } from '@/shared/config/demo';
import { cn } from '@/shared/lib/cn';
import { Checkbox } from '@/shared/ui/checkbox';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { useRole } from '@/entities/user';
import { LOGIN_VIDEO_LABEL, LOGIN_VIDEO_SRC, REMEMBERED_ID_KEY } from '../config/login-media';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * 기억해 둔 아이디를 **렌더 중에 안전하게** 읽는다.
 *
 * effect에서 읽어 `setState`로 넣던 판본은 렌더가 한 번 더 돌고(린트도 막는다), 렌더 중에
 * 그냥 읽으면 서버가 모르는 값이라 hydration이 깨진다. `useSyncExternalStore`는 서버·첫
 * 렌더에는 `getServerSnapshot`을, 그 뒤에는 브라우저 값을 준다 — 두 문제가 함께 없어진다.
 *
 * 저장값은 이 화면에서만 바뀌므로 구독은 아무것도 하지 않는다(빈 해지 함수만 돌려준다).
 */
const subscribeNothing = () => () => {};
const noRememberedId = () => null;

/*
 * **저장소 접근이 막힐 수 있다.** 시크릿 모드나 쿠키 차단 설정에서는 `localStorage`에
 * 손대는 것만으로 예외가 난다 — 감싸지 않으면 이 화면은 렌더에서 터지고, 아래 제출 처리에서는
 * **로그인 버튼이 아무 일도 하지 않는다.** 저장소는 편의(아이디 기억)일 뿐이라 막히면 그것만 잃는다.
 * 앱의 다른 저장은 `shared/lib/local-store.ts`가 이미 같은 방식으로 감싸고 있다.
 */
const readRememberedId = () => {
  try {
    return window.localStorage.getItem(REMEMBERED_ID_KEY);
  } catch {
    return null;
  }
};

const rememberId = (id: string, keep: boolean) => {
  try {
    if (keep) window.localStorage.setItem(REMEMBERED_ID_KEY, id);
    else window.localStorage.removeItem(REMEMBERED_ID_KEY);
  } catch {
    /* 못 남겨도 로그인은 되어야 한다 */
  }
};

/**
 * 로그인 — **영상 위의 한 화면** `[사용자 지시 2026-08-25: 첨부 이미지]`.
 *
 * 방류구 영상이 화면 전체를 덮고, 그 위에 어두운 막이 깔리고, 오른쪽에 흐린 유리 기둥이 서서
 * 폼을 담는다. 왼쪽 글은 영상 위에 직접 놓인다.
 *
 * **이 화면에서만 유리를 쓴다.** 대시보드의 모달은 뒤가 비치면 어느 숫자가 그 모달의 것인지
 * 알 수 없어 불투명이지만(R12), 여기 뒤에 있는 것은 값이 아니라 영상이라 비쳐도 읽을 것이 없다.
 *
 * 시연 계정 하나로 들어간다. 역할은 여기서 고르지 않는다 — 계정이 하나라 역할 선택을 로그인에
 * 두면 그것이 인증처럼 읽힌다. 전환은 헤더의 계정 메뉴에 있다.
 */
export function LoginView() {
  const { signIn } = useRole();
  const savedId = useSyncExternalStore(subscribeNothing, readRememberedId, noRememberedId);

  /*
   * 입력값은 **사용자가 손대기 전까지 파생**이다 — 기억해 둔 아이디가 있으면 그것, 없으면
   * 시연 계정. 손대는 순간부터는 그 값이 이긴다. 상태를 저장값으로 덮어쓰지 않으므로
   * effect도, 그로 인한 추가 렌더도 없다.
   */
  const [typedId, setTypedId] = useState<string | null>(null);
  const [rememberChoice, setRememberChoice] = useState<boolean | null>(null);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNT.password);
  const videoRef = useRef<HTMLVideoElement>(null);

  const id = typedId ?? savedId ?? DEMO_ACCOUNT.id;
  const remember = rememberChoice ?? savedId !== null;

  /* 감속 설정이면 영상을 멈춘다 — 배경이 계속 움직이면 그 설정의 뜻이 없어진다 */
  useEffect(() => {
    if (!window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    videoRef.current?.pause();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    /* 아이디 저장은 **화면이 하는 일**이다 — 서버가 없어도 다음 방문에 그대로 채워진다 */
    rememberId(id, remember);
    signIn();
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0b1017]">
      {/*
       * 영상은 장식이라 보조기술에서 숨긴다. `muted`가 없으면 브라우저가 자동재생을 막고,
       * `playsInline`이 없으면 iOS가 전체화면으로 띄운다.
       */}
      <video
        ref={videoRef}
        /*
         * `object-cover`가 비율을 지키며 화면을 덮고, `object-position`은 **넘치는 쪽에서
         * 어디를 보여줄지**만 고른다 — 늘리거나 찌그러뜨리지 않는다. 50%(가운데)에서 35%로
         * 내리면 위쪽이 더 보이므로 화면 속 장면이 그만큼 아래로 내려온다.
         *
         * 세로로 넘칠 때만 듣는다. 폭이 좁고 높은 화면(세로 모바일)에서는 영상이 가로로
         * 넘쳐 세로 여유가 없고, 그때는 이 값이 아무 일도 하지 않는다 — 잘못된 것이 아니라
         * 잘라낼 세로가 없는 것이다.
         */
        className="absolute inset-0 size-full object-cover object-[center_35%]"
        src={LOGIN_VIDEO_SRC}
        aria-hidden
        aria-label={LOGIN_VIDEO_LABEL}
        autoPlay
        muted
        loop
        playsInline
      />

      {/*
       * **어두운 막** — 전면 20% 먹 `[사용자 지시 2026-08-25: 지정한 값]`.
       *
       * 좌우 그라데이션(72%→14%)이던 것을 균일한 20%로 바꿨다. 영상이 밝게 남는 대신
       * **왼쪽 흰 글자의 대비는 영상 프레임에 맡겨진다** — 밝은 프레임에서 흐려질 수 있어
       * 제목·설명에 그림자를 둬 글자 가장자리를 세운다(막의 값은 지정대로 두고 글자만 보강).
       */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.2)' }}
      />

      <div className="relative grid min-h-[100dvh] lg:grid-cols-[1fr_minmax(420px,600px)]">
        {/* 왼쪽 — 무엇을 하는 시스템인가. 영상 위에 직접 놓인다 */}
        <section className="hidden flex-col justify-start px-16 pt-28 lg:flex xl:px-24 xl:pt-32">
          {/* 마크와 머리글 줄을 걷었다 `[사용자 지시 2026-08-25]` — 제목이 곧 브랜드다 */}
          {/*
           * 지정한 타이포는 **48/52 · 600 · -1.2px** `[사용자 지시 2026-08-25]`.
           *
           * 그 값은 xl부터 쓴다. lg(1024px)에서 이 열은 424px이고 좌우 여백 128px을 빼면
           * 296px만 남아, 48px 글자로는 제목이 세 줄이 된다 — 두 줄로 읽히도록 한 단 낮춘
           * 40/44를 두고 자간도 같은 비율(-1px)로 줄인다.
           *
           * 글꼴은 지정한 `Pretendard Variable`이 이미 전역 `--font-sans`라 따로 걸지 않는다.
           */}
          <h1
            className="max-w-[13ch] break-keep text-[40px] font-semibold leading-[44px] tracking-[-1px] text-[#fdfdfd] xl:text-[48px] xl:leading-[52px] xl:tracking-[-1.2px]"
            style={{ textShadow: '0 2px 12px rgb(0 0 0 / 45%)' }}
          >
            {/* 사업계획서 p.37·p.118의 국문 정식명. 줄여 쓰지 않는다(A2) */}
            {BRAND_NAME}
          </h1>
          {/*
           * 제목보다 **한 단 가라앉힌다** `[사용자 지시 2026-08-25]` — 제목 #FDFDFD(거의 흰색)
           * 대비 72%다. 20% 먹 위에서 흰 글자의 대비는 영상 밝기에 달렸으므로 더 내리지 않고,
           * 이 값에서도 그림자가 글자 가장자리를 세운다.
           */}
          <p
            className="mt-5 max-w-[34ch] break-keep text-[14px] leading-relaxed text-white/70 xl:max-w-[540px]"
            style={{ textShadow: '0 1px 8px rgb(0 0 0 / 45%)' }}
          >
            {/* AI 산출 4종을 줄여 적지 않는다 — 하나를 빼면 범위가 달라 보인다(A2) */}
            {/*
             * 줄내림은 **뜻이 끊기는 자리**에 둔다 — 무엇을 모으는가 / 무엇을 돌려주는가 / 어디로.
             * xl에서만 쓴다: 그 아래에서는 열이 424px뿐이라 지정한 자리에서 끊어도 곧바로 다시
             * 접혀 줄이 들쭉날쭉해진다. 숨기면 앞뒤 글이 한 칸 띄고 이어져 문장은 그대로다.
             */}
            현장 센서와 ECP가 모은 수질·설비 시계열을 Cloud AI가 읽고,
            <br className="hidden xl:inline" />
            이상 탐지 · 수질 예측 · 오염도 추정 · 설비 이상 탐지 결과를
            <br className="hidden xl:inline" />한 화면으로 돌려줍니다.
          </p>
        </section>

        {/*
         * 오른쪽 — **흐린 유리 기둥**. 화면 높이를 다 쓴다. 좁은 화면에서는 화면 전체가 된다.
         * 왼쪽 선은 걷었다 `[사용자 지시 2026-08-25]` — 면이 위 60%에서 시작해 아래 10%로
         * 풀리는데 선은 끝까지 같은 굵기로 남아, 유리가 사라진 아래쪽에서 선만 떠 보였다.
         */}
        <section
          className="login-glass flex items-center justify-center px-6 py-16 sm:px-10"
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)',
            boxShadow: '2px 4px 12px 0 rgba(0, 51, 109, 0.2)',
            /* Safari는 접두사 없이는 흐리지 않는다 — Tailwind 유틸이 하던 일을 여기서 직접 한다 */
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <StaggerGroup className="w-full max-w-[368px]">
            <RiseItem>
              <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">
                로그인
              </h2>
            </RiseItem>

            <RiseItem>
              <form onSubmit={submit} className="mt-6 space-y-3.5">
                <Field
                  id="account-id"
                  label="아이디"
                  value={id}
                  onChange={setTypedId}
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                />
                <PasswordField value={password} onChange={setPassword} />

                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg">
                  <Checkbox
                    checked={remember}
                    onChange={(event) => setRememberChoice(event.target.checked)}
                  />
                  아이디 저장
                </label>

                {/* CTA는 포인트색이다 — 상태색은 쓰지 않는다. 흰 글자 대비 7.8:1 */}
                {/* 폼의 마지막 조작이라 위 간격을 한 단 더 준다 — 체크박스와 붙으면 한 덩어리로 읽힌다 */}
                <button
                  type="submit"
                  className="mt-1 w-full cursor-pointer rounded-nested bg-accent px-3 py-3.5 text-[14px] font-semibold text-white transition-opacity duration-200 hover:opacity-90"
                >
                  로그인
                </button>
              </form>
            </RiseItem>

          </StaggerGroup>
        </section>
      </div>
    </main>
  );
}

/**
 * 입력 칸 — **유리 위에서는 불투명한 흰 면**이다 `[사용자 지시 2026-08-25: 첨부 이미지]`.
 * 반투명이면 뒤 영상이 글자 뒤에서 움직여 읽기가 흔들린다.
 * 높이는 46px(`py-3` + 14px 글자) `[사용자 지시 2026-08-25: 좀 줄여]` — 44px(손가락 최소)을
 * 넘기는 선에서 가장 낮은 값이다. 더 줄이면 터치 대상 권고를 밑돈다.
 */
const FIELD_CLASS =
  'w-full rounded-nested border border-border bg-surface px-3.5 py-3 text-[14px] text-fg outline-none transition-colors duration-200 placeholder:text-fg-subtle hover:border-border-strong focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/35';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ id, label, value, onChange, placeholder, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={cn(FIELD_CLASS, 'mt-2')}
      />
    </div>
  );
}

/**
 * 비밀번호 칸 — 눈 아이콘으로 가림을 푼다.
 *
 * **아이디 칸에는 눈을 두지 않는다.** 래퍼런스 이미지에는 두 칸 모두 있지만, 가려지지 않은
 * 글자에 가림 해제 버튼을 두면 눌러도 아무 일이 없어 고장으로 읽힌다.
 */
function PasswordField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;

  return (
    <div>
      <label htmlFor="account-password" className="block text-[13px] text-fg-muted">
        비밀번호
      </label>
      <div className="relative mt-2">
        <input
          id="account-password"
          type={shown ? 'text' : 'password'}
          value={value}
          placeholder="비밀번호를 입력하세요"
          autoComplete="current-password"
          onChange={(event) => onChange(event.target.value)}
          className={cn(FIELD_CLASS, 'pr-12')}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? '비밀번호 가리기' : '비밀번호 보기'}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-nested text-fg-subtle transition-colors duration-200 hover:text-accent"
        >
          <Icon aria-hidden size={18} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
