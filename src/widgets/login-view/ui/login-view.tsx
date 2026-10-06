'use client';

import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { DEMO_ACCOUNT } from '@/shared/config/demo';
import { cn } from '@/shared/lib/cn';
import { BrandMark } from '@/shared/ui/brand-mark';
import { Checkbox } from '@/shared/ui/checkbox';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { useRole } from '@/entities/user';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import {
  LOGIN_POSTER_PORTRAIT_SRC,
  LOGIN_POSTER_SRC,
  LOGIN_VIDEOS,
  LOGIN_VIDEO_KEY,
  LOGIN_VIDEO_LABEL,
  LOGIN_WIDE_QUERY,
  REMEMBERED_ID_KEY,
  resolveLoginVideo,
} from '../config/login-media';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * 배경이 화면을 덮는 방법. **정지 이미지와 영상이 같은 문자열을 쓴다** `[사용자 결정 2026-09-17]`.
 *
 * `object-cover`가 비율을 지키며 덮고 `object-position`은 **넘치는 쪽에서 어디를 보여줄지**만
 * 고른다 — 늘리거나 찌그러뜨리지 않는다. 50%(가운데)에서 35%로 내리면 위쪽이 더 보인다.
 *
 * 세로로 넘칠 때만 듣는다. 폭이 좁고 높은 화면(세로 모바일)에서는 배경이 가로로 넘쳐 세로
 * 여유가 없고, 그때는 이 값이 아무 일도 하지 않는다 — 잘못된 것이 아니라 잘라낼 세로가 없는 것이다.
 * 세로본(1216×2160)을 깐 뒤에도 그대로다: 세로 화면이 그 그림보다 더 길어 여전히 가로가 넘친다.
 *
 * **두 곳에 따로 적지 않는 이유**: 한쪽만 고치면 좁은 화면과 넓은 화면이 **다른 화각**을
 * 보여주는데, 두 폭을 나란히 놓고 보지 않으면 눈에 띄지 않는다. 그림 파일이 둘로 갈린 지금도
 * **잘라내는 규칙은 하나여야 한다** — 세로본은 가로본의 가운데를 그대로 떼어 낸 것이라,
 * 두 폭이 보는 화각이 «같은 장면의 같은 자리»로 이어진다.
 */
const BACKDROP_FRAMING = 'object-cover object-[center_35%]';

/**
 * 화면을 덮는 자리. **영상만 쓴다** — 정지 이미지는 `next/image`의 `fill`이 같은 일을
 * 스스로 하므로 겹쳐 적으면 서로 다른 두 규칙이 같은 결과를 내는 척하게 된다.
 */
const BACKDROP_FILL = 'absolute inset-0 size-full';

/**
 * 배경 영상 — **768px(`md`) 이상에서만 마운트된다** `[사용자 결정 2026-09-17]`.
 *
 * **부품으로 뺀 이유는 감속 설정이다.** 멈추는 effect가 `LoginView`에 있으면, 영상이
 * 하이드레이션 **뒤에** 생기는 탓에 그 시점엔 `ref`가 비어 `?.`가 조용히 삼킨다 — 감속 설정을
 * 켠 데스크톱 사용자에게 배경이 계속 돈다. 여기에 두면 **마운트가 곧 의존성**이라 손으로
 * 맞춘 배열에 기대지 않는다(`exhaustive-deps`는 경고라 그 실수를 잡아 주지 않는다).
 *
 * `poster`가 좁은 화면에 깔리는 그 이미지와 **같은 파일**이다 — 영상이 처음 그리는 프레임이
 * 곧 그 이미지라 넓은 화면으로 넘어갈 때 장면이 튀지 않는다.
 */
function LoginVideo({ videoSrc }: { videoSrc: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /*
   * 감속 설정이면 영상을 멈춘다 — 배경이 계속 움직이면 그 설정의 뜻이 없어진다.
   * 전역 `@media (prefers-reduced-motion: reduce)`는 CSS 애니메이션만 끄고 **영상 재생은
   * 끄지 못한다**(`globals.css`).
   *
   * **`videoSrc`에 매달아 둔다.** 영상을 갈아 끼우면 새 파일이 자동재생으로 다시 도는데,
   * 마운트에서 한 번만 멈추면 그 순간부터 감속 설정이 무시된다. 목록에서 고를 수 있게 되면서
   * 생긴 자리다 — 선택 기능을 지울 때 이 의존성도 함께 없어진다.
   */
  useEffect(() => {
    if (!window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    videoRef.current?.pause();
  }, [videoSrc]);

  return (
    /* 영상은 장식이라 보조기술에서 숨긴다. `muted`가 없으면 자동재생이 막히고, `playsInline`이
       없으면 iOS가 전체화면으로 띄운다 */
    <video
      ref={videoRef}
      className={cn(BACKDROP_FILL, BACKDROP_FRAMING)}
      /* `key`가 있어야 갈아 끼운 파일을 브라우저가 다시 읽는다 — `src`만 바꾸면 첫 영상이 남는다 */
      key={videoSrc}
      src={videoSrc}
      poster={LOGIN_POSTER_SRC}
      aria-hidden
      aria-label={LOGIN_VIDEO_LABEL}
      autoPlay
      muted
      loop
      playsInline
    />
  );
}

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

/*
 * TODO(영상 확정 시 제거): 시연용 영상 선택 `[사용자 요청 2026-09-07]` —
 * 지우는 순서는 `config/login-media.ts`의 구분선 주석에 있다.
 *
 * 아이디와 **같은 규율로** 감싼다. 시크릿 모드에서는 `localStorage`에 손대는 것만으로
 * 예외가 나 이 화면이 렌더에서 터진다(실제로 그렇게 터졌다).
 */
const readChosenVideo = () => {
  try {
    return window.localStorage.getItem(LOGIN_VIDEO_KEY);
  } catch {
    return null;
  }
};

const chooseVideo = (src: string) => {
  try {
    window.localStorage.setItem(LOGIN_VIDEO_KEY, src);
  } catch {
    /* 못 남겨도 이번 세션에는 바뀐다 — 아래 상태가 이긴다 */
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

  /*
   * TODO(영상 확정 시 제거): 시연용 영상 선택 `[사용자 요청 2026-09-07]`.
   *
   * 저장값을 **렌더 중에 안전하게** 읽는다 — 서버는 `localStorage`를 모르므로 그냥 읽으면
   * 하이드레이션이 깨진다(위 `savedId`와 같은 이유·같은 방법).
   */
  const storedVideo = useSyncExternalStore(subscribeNothing, readChosenVideo, noRememberedId);
  const [pickedVideo, setPickedVideo] = useState<string | null>(null);
  const videoSrc = resolveLoginVideo(pickedVideo ?? storedVideo);

  /*
   * **좁은 화면에서는 영상을 아예 마운트하지 않는다** `[사용자 결정 2026-09-17]`.
   *
   * 감추는 것으로는 데이터가 줄지 않는다 — `display:none`이어도 브라우저가 그대로 내려받는다
   * (실측: 보이는 영상 1건 · `display:none` 1건 · 부모가 `display:none` 1건 · 마운트 안 함 0건).
   * 그 아래에서는 유리 기둥이 화면 전체를 덮고 `blur(20px)`이 걸려 **영상이 한 번도 보이지
   * 않는데** 65.2MB를 쓰고 있었다.
   *
   * 서버·하이드레이션 중에는 `false`라 **서버 HTML에도 영상이 없다** — 마크업이 같아 어긋날
   * 자리가 없다(`useMediaQuery`).
   */
  const isWide = useMediaQuery(LOGIN_WIDE_QUERY);

  const id = typedId ?? savedId ?? DEMO_ACCOUNT.id;
  const remember = rememberChoice ?? savedId !== null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    /* 아이디 저장은 **화면이 하는 일**이다 — 서버가 없어도 다음 방문에 그대로 채워진다 */
    rememberId(id, remember);
    signIn();
  };

  return (
    /*
     * 바탕색이 **토큰이 아닌 리터럴**이다(§8 `토큰 밖 색`). 영상이 뜨기 전과 비율이 안 맞는
     * 폭에서 이 색이 보이는데, `--bg`를 쓰면 라이트 테마에서 흰 면이 되어 영상 위아래로
     * **흰 띠**가 생긴다. 이 화면의 바탕은 테마를 따라가면 안 된다.
     */
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0b1017]">
      {/*
       * **좁은 화면은 정지 이미지, 넓은 화면은 영상** `[사용자 결정 2026-09-17]`.
       *
       * 둘은 같은 프레이밍(`object-cover` + `center 35%`)을 쓰고, 이미지가 그 영상의 첫
       * 프레임이라 데스크톱에서 갈아 끼울 때 장면이 튀지 않는다.
       */}
      {!isWide && (
        <Image
          /*
           * **세로로 잘라 둔 판본이다** `[사용자 지적 2026-09-17: 화질이 좋지 않아보임]`.
           * 가로본을 좁은 화면에 깔면 `object-cover`가 짧은 쪽(가로)에 맞춰 늘려 네 배로
           * 확대된다 — 왜 그런지는 `login-media.ts`가 계산과 함께 갖고 있다.
           */
          src={LOGIN_POSTER_PORTRAIT_SRC}
          alt=""
          aria-hidden
          /*
           * `fill`이 스스로 `absolute inset-0`을 깔므로 자리 잡는 클래스는 두지 않는다 —
           * 남기는 것은 영상과 **같은 프레이밍**뿐이다.
           */
          fill
          /*
           * 좁은 화면에서는 배경이라 **화면 폭 그대로**다. 안 적으면 기본값이 과하게 큰 원본을 고른다.
           *
           * 768px 이상의 `1px`은 **가장 작은 판본으로 받으라는 뜻이다.** 그 폭에서 이 그림은
           * 화면에 남지 않지만(하이드레이션 직후 영상으로 갈린다) **서버가 보낸 HTML에는 들어
           * 있어** 브라우저가 파싱하면서 먼저 받기 시작한다 — React가 걷어도 이미 나간 요청이다.
           *
           * **0으로는 못 만든다.** srcset의 후보가 `deviceSizes`에서 나와 아무리 작게 적어도
           * 640폭이 바닥이다(실측: 1440px에서 150KB → 72KB). 아주 없애려면 `next/image`를 버리고
           * 미디어 쿼리 안의 CSS 배경으로 가야 하는데, 그러면 폭·DPR에 맞춰 줄여 주는 것과
           * WebP 변환을 함께 잃어 **좁은 화면이 146KB 대신 302KB를 받는다.** 아끼려는 72KB는
           * 넓은 화면이 어차피 받는 65.2MB의 0.1%라, 좁은 화면 쪽을 택했다.
           */
          sizes="(min-width: 48rem) 1px, 100vw"
          /* 첫 페인트를 밀지 않는다 — 이 화면에서 가장 먼저 보이는 그림이다 */
          priority
          className={BACKDROP_FRAMING}
        />
      )}

      {isWide && <LoginVideo videoSrc={videoSrc} />}

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

      {/*
       * **좁은 화면에서는 두 칸을 세로 가운데에 모은다** `[사용자 지적 2026-09-17: 로고,
       * Title, 로그인 영역이 하단에 너무 치우쳐져 있음]`.
       *
       * 처음엔 위 칸을 `1fr`로 늘려 브랜드를 그 바닥에 붙였다(`justify-end`). 그러면 카드가
       * 화면 아래에 고정되고 **위쪽 절반이 통째로 빈 사진**이 되어, 읽을 것이 전부 아래로
       * 몰렸다. 두 칸을 자기 높이대로 두고 남는 여백을 위아래로 나누면 흔한 모바일 로그인의
       * 세로 가운데가 된다.
       *
       * **`min-h`라서 넘칠 걱정이 없다.** `height`였다면 내용이 화면보다 클 때 `content-center`가
       * 위로도 밀어내 그만큼 스크롤로 닿지 못한다 — `min-height`는 내용이 커지면 상자가 함께
       * 자라 나눌 여백이 0이 된다.
       *
       * 768px 이상은 되돌린다 — 그쪽은 유리 기둥이 화면 높이를 다 써야 해서 행이 늘어나야 한다.
       *
       * **기둥의 폭이 두 단이다** `[사용자 요청 2026-09-17: 768px 기준]`. `minmax(420px,600px)`
       * 하나로 두면 **768px에서 기둥이 600px을 가져가 왼쪽 열에 168px만 남는다** — 제목이 넉 줄로
       * 접히고 설명은 세로 띠가 된다(실측). `1fr`의 자동 최솟값이 min-content라 왼쪽이 먼저 짜부라지고
       * 기둥이 자기 최대까지 자라기 때문이다. 그 구간에서는 기둥을 **420px로 고정**해 왼쪽에
       * 348px을 남긴다.
       */}
      <div className="relative grid min-h-[100dvh] content-center py-6 md:content-normal md:grid-cols-[1fr_420px] md:py-0 lg:grid-cols-[1fr_minmax(420px,600px)]">
        {/*
         * **좁은 화면의 브랜드** `[사용자 결정 2026-09-17]`.
         *
         * 아래 왼쪽 열이 768px 미만에서 통째로 감춰져 **이 화면에 로고도 제품명도 없었다** —
         * 남는 글자가 「로그인」 하나였다. 그 열을 그대로 쓰지 않는 이유는 타이포다: 그쪽은
         * 그쪽은 가장 좁을 때도 284px을 전제로 26/32가 잡혀 있어 390px에 두면 너무 작다.
         *
         * 배경 위에 직접 놓이므로 대비는 프레임에 달렸다 — 왼쪽 열과 같은 그림자를 둔다.
         */}
        {/*
         * 좌우 여백이 **아래 카드의 글자에 맞춰져 있다** — 카드가 `mx-4`만큼 들어오고 그 안이
         * `px-6`이라 글이 40px에서 시작한다. 화면 여백(24px)에 맞추면 브랜드만 14px 왼쪽으로
         * 튀어나와, 어긋났다는 것만 보이고 이유는 보이지 않는다.
         */}
        <section className="flex flex-col px-10 pb-7 md:hidden">
          <BrandMark size={34} />
          <p
            className="mt-3 max-w-[16ch] break-keep text-[24px] font-semibold leading-[30px] tracking-[-0.5px] text-[#fdfdfd]"
            style={{ textShadow: '0 2px 12px rgb(0 0 0 / 45%)' }}
          >
            {BRAND_NAME}
          </p>
        </section>

        {/* 왼쪽 — 무엇을 하는 시스템인가. 영상 위에 직접 놓인다 */}
        <section className="hidden flex-col justify-start px-8 pt-16 md:flex lg:px-16 lg:pt-28 xl:px-24 xl:pt-32">
          {/* 마크와 머리글 줄을 걷었다 `[사용자 지시 2026-08-25]` — 제목이 곧 브랜드다 */}
          {/*
           * 지정한 타이포는 **48/52 · 600 · -1.2px** `[사용자 지시 2026-08-25]`.
           *
           * **폭마다 한 단씩 낮춘다 — 이 열이 좁아지기 때문이다.** 오른쪽 기둥이 최소 420px을
           * 먼저 가져가고 남는 것이 이 열이라, 화면이 좁아지는 만큼 이쪽만 줄어든다.
           *
           * | 화면 | 이 열 | 글이 놓일 폭 | 제목 |
           * |---|---|---|---|
           * | 768px(`md`) | 348px | 284px (여백 32px씩) | **26/32 · -0.6px** |
           * | 1024px(`lg`) | 424px | 296px (여백 64px씩) | 40/44 · -1px |
           * | 1280px(`xl`) 이상 | 넉넉 | — | 48/52 · -1.2px (지정값) |
           *
           * 각 단은 **제목이 두 줄로 읽히는 가장 큰 값**이다 — 한 단 위를 쓰면 세 줄이 되고,
           * 그러면 아래 설명과 붙어 덩어리로 보인다. 768px 단이 2026-09-17에 새로 생겼다
           * `[사용자 요청 2026-09-17: 768px 기준]`: 그 폭이 좁은 화면이던 시절에는 이 열이
           * 아예 감춰져 있어 필요가 없었다.
           *
           * 글꼴은 지정한 `Pretendard Variable`이 이미 전역 `--font-sans`라 따로 걸지 않는다.
           */}
          <h1
            className="max-w-[13ch] break-keep text-[26px] font-semibold leading-[32px] tracking-[-0.6px] text-[#fdfdfd] lg:text-[40px] lg:leading-[44px] lg:tracking-[-1px] xl:text-[48px] xl:leading-[52px] xl:tracking-[-1.2px]"
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
             * xl에서만 쓴다: 그 아래에서는 열이 좁아 지정한 자리에서 끊어도 곧바로 다시 접혀
             * 줄이 들쭉날쭉해진다.
             *
             * **띄어쓰기를 `{' '}`로 적어야 한다** `[사용자 지적 2026-09-17: 768px 기준]`.
             * 한때 이 주석이 *"숨기면 앞뒤 글이 한 칸 띄고 이어져 문장은 그대로다"* 라 적었는데
             * **사실이 아니었다** — JSX는 엘리먼트에 붙은 텍스트의 **줄바꿈이 섞인 공백을 지운다.**
             * 그래서 xl 미만에서 문장이 «결과를한 화면으로»로 붙어 있었다(1024px 화면에서 줄곧
             * 그랬고, 768px이 넓은 화면이 되며 눈에 들어왔다). `<br>`이 `display:none`이어도
             * 이 공백은 살아 있고, 보일 때는 줄이 바뀌어 눈에 띄지 않는다.
             */}
            현장 센서와 ECP가 모은 수질·설비 시계열을 Cloud AI가 읽고,{' '}
            <br className="hidden xl:inline" />
            이상 탐지 · 수질 예측 · 오염도 추정 · 설비 이상 탐지 결과를{' '}
            <br className="hidden xl:inline" />한 화면으로 돌려줍니다.
          </p>
        </section>

        {/*
         * 오른쪽 — **흐린 유리 기둥**. 화면 높이를 다 쓴다. 좁은 화면에서는 화면 전체가 된다.
         * 왼쪽 선은 걷었다 `[사용자 지시 2026-08-25]` — 면이 위 60%에서 시작해 아래 10%로
         * 풀리는데 선은 끝까지 같은 굵기로 남아, 유리가 사라진 아래쪽에서 선만 떠 보였다.
         */}
        {/*
         * 면·그림자·흐림은 `globals.css`의 `.login-glass`가 갖는다 — **폭으로 갈라야 해서**
         * 인라인 `style`에서 옮겼다(인라인은 미디어 쿼리를 쓸 수 없다). 좁은 화면은 불투명,
         * 768px 이상은 지금까지의 흐린 유리 그대로다.
         */}
        {/*
         * **좁은 화면에서는 화면에 붙이지 않고 띄운다** `[사용자 지적 2026-09-17: 로그인 입력
         * 영역이 하단에 꽉 차있어서 답답함을 줌]`.
         *
         * 처음엔 이 면이 아래 절반을 **모서리까지 꽉 채웠다.** 위는 배경 사진, 아래는 흰 면이
         * 맞닿아 화면이 두 덩어리로 잘렸고 사진이 면 뒤로 이어진다는 느낌이 없었다. 좌우·아래로
         * 여백을 두고 모서리를 굴리면 **사진이 면을 감싸** 한 장면 위에 카드가 놓인 것으로 읽힌다.
         *
         * 768px 이상은 건드리지 않는다 — 그쪽은 화면 높이를 다 쓰는 **기둥**이고 `[사용자 지시
         * 2026-08-25: 첨부 이미지]`가 정한 구성이다. 여백과 모서리를 그 폭에서 되돌린다.
         */}
        <section className="login-glass mx-4 flex items-center justify-center rounded-panel px-6 py-10 sm:mx-8 sm:px-10 md:mx-0 md:rounded-none md:py-16">
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

      {/*
       * TODO(영상 확정 시 제거): 시연용 영상 선택 `[사용자 요청 2026-09-07]` —
       * *"수처리 관련 동영상 여러개를 보여드린 후 영상 픽스 예정"*. 지우는 순서는
       * `config/login-media.ts`의 구분선 주석에 있다.
       *
       * **화면 왼쪽 아래 구석에 둔다.** 이 화면의 구성은 첨부 이미지로 지정된 것이라
       * (`[사용자 지시 2026-08-25]`) 영상·먹·유리 기둥·폼 어디에도 끼워 넣지 않는다 —
       * 구석에 떠 있으면 «화면의 일부»가 아니라 «발표자가 쓰는 것»으로 읽히고, 지울 때
       * 지정된 구성에 손댈 일이 없다.
       *
       * 격자 **밖**이라 좁은 폭에서도 남는다. 왼쪽 글 영역은 768px 미만에서 감춰지므로
       * 그 안에 두면 노트북 화면에서 사라진다.
       */}
      <div
        role="group"
        aria-label="시연용 배경 영상 선택"
        /*
         * **768px 이상에서만** `[사용자 결정 2026-09-17]`. 좁은 화면에는 **고를 영상 자체가
         * 없고**(그 폭에서는 정지 이미지를 쓴다), 폼 위에 겹쳐 뜨던 것과 버튼 높이가 약 26px이라
         * 손가락 최소(44px)에 못 미치던 것도 함께 사라진다.
         *
         * 한때 «격자 밖이라 좁은 폭에서도 남는다»가 이 자리의 근거였는데, 그때는 좁은 폭에서도
         * 고를 것이 있었다.
         */
        className="absolute bottom-4 left-4 z-10 hidden items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2 py-1.5 backdrop-blur-sm md:flex"
      >
        {/* 무엇을 고르는 자리인지 적는다 — 아이콘만 두면 발표자도 무엇인지 모른다 */}
        <span className="px-1 text-[12px] font-medium text-white/70">배경</span>
        {LOGIN_VIDEOS.map((video) => {
          const on = video.src === videoSrc;
          return (
            <button
              key={video.src}
              type="button"
              onClick={() => {
                setPickedVideo(video.src);
                chooseVideo(video.src);
              }}
              aria-pressed={on}
              className={cn(
                'cursor-pointer rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/70',
                on ? 'bg-white text-[#0b1017]' : 'text-white/80 hover:bg-white/15',
              )}
            >
              {video.name}
            </button>
          );
        })}
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
