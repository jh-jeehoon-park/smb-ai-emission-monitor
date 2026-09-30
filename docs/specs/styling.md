# 스타일 작성 규칙 (SCSS 모듈)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 스타일 작성 규칙 (SCSS 모듈) |
| 버전 | v1.0.0 |
| 작성일 | 2026-09-29 |
| 기반 문서 | /CLAUDE.md, /docs/specs/screens.md, /src/app/globals.scss, /src/shared/styles/index.scss |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2026-09-29 | Claude | 신규 작성 — Tailwind CSS → SCSS 모듈 전환 `[사용자 요청 2026-09-29: develop 유지 · 새 브랜치에서 Tailwind > Sass(scss) 전환]`. 파일 배치 · 값의 원천 · **레이어 규칙**(tailwind-merge가 하던 «호출부가 이긴다»를 CSS 레이어로 재현) · 전역 도움 클래스 · 애니메이션 · hover 재선언 · 하지 않는 것. 전환에서 실제로 밟은 함정 다섯(레이어 순서 · 역할 숨김 · hover 손실 · 애니메이션 이름 · 서버 캐시)을 근거로 적었다 |

---

## 2. 목적과 범위

`src/**/*.module.scss`와 `src/app/globals.scss`를 쓰고 고칠 때 따르는 규칙이다. **무엇을 보여 주는가**(색 값·간격·글자 크기)는 [`screens.md`](screens.md) §8이 정하고, 이 문서는 **그것을 SCSS로 어떻게 적는가**만 정한다.

> 이 저장소는 2026-09-29까지 Tailwind CSS였다(`develop`). 전환은 **화면을 한 픽셀도 바꾸지 않는 것**을 목표로 했고, 29개 경로 × 390/1440px × 라이트(+1440 다크) 87장을 전환 전후로 픽셀 대조했다. `screens.md` §8에 남은 Tailwind 표기(`lg:min-h-0` 등)는 그때의 이름이다 — §5의 표로 읽는다.

---

## 3. 파일 배치

| 무엇 | 어디 |
|---|---|
| 컴포넌트 스타일 | `foo-bar.tsx` 옆 **`foo-bar.module.scss`** 하나. `import styles from './foo-bar.module.scss';` |
| 공용 믹스인·함수 | `src/shared/styles/` — `_breakpoints` · `_media` · `_spacing` · `_mixins` · `_layers`. 모듈 첫 줄은 **`@use 'shared/styles' as *;`** (생략하지 않는다 — 레이어 순서 선언이 이것으로 따라온다, §6.1) |
| 토큰 · 초기화 · 전역 도움 클래스 | `src/app/globals.scss` · `src/app/_reset.scss` |

- 클래스 이름은 **camelCase로 뜻을 적는다**(`row` · `rowActive` · `valueUnit`). `c1` · `wrapper2` 금지.
- `shared/styles`를 찾는 경로는 `next.config.ts`의 `sassOptions.loadPaths`가 준다 — 상대 경로(`../../..`)로 적지 않는다.
- 조건부 조합은 `cn()`(`@/shared/lib/cn`, `clsx`)으로 한다. 클래스를 값으로 담는 맵(`Record<X, string>`)은 모듈 클래스를 값으로 둔다.

---

## 4. 값 — 토큰과 함수로만

| 무엇 | 쓰는 것 | 금지 |
|---|---|---|
| 색 | `var(--surface)` · `var(--fg-muted)` · `var(--accent)` … (`globals.scss` `:root`) | hex 직접 입력(R9). `screens.md` §8 `토큰 밖 색`에 등재된 것만 예외 |
| 간격 | **`sp(n)`** = `n × 0.25rem` (예: `padding: sp(4) sp(5)`) | 눈대중 px |
| 모서리 | `var(--radius-panel)` 16px · `var(--radius-nested)` 8px · `var(--radius-chip)` 4px | |
| 그림자 | `var(--card-shadow)` · `var(--track-inset)` | |
| 글자 | `font-size: 12px`처럼 그대로. **최소 12px**(그래프 안만 예외, §8 `글자 최소`) | 11px 이하 |
| 투명도 | `color-mix(in oklab, var(--accent) 40%, transparent)` — 앞에 불투명 값 한 줄을 대체값으로 둔다 | 배경 투명(R12)은 사용자 지시가 있을 때만 |

---

## 5. 반응형 · 상태 — Tailwind 표기와의 대응

| Tailwind 시절 | SCSS |
|---|---|
| `sm:` `md:` `lg:` `xl:` `2xl:` | `@include up(sm)` … `@include up('2xl')` (40 · 48 · 64 · 80 · 96rem). `2xl`은 따옴표가 필요하다 — 따옴표가 없으면 Sass가 숫자로 읽는다 |
| `max-lg:` | `@include down(lg)` |
| `hover:` | `@include hover { &:hover { … } }` — hover가 되는 기기에서만 |
| `motion-safe:` · `motion-reduce:` | `@include motion-safe { … }` · `@include motion-reduce { … }` |
| `@container` · `@[44rem]:` | 부모에 `container-type: inline-size` · 자식에 `@container (min-width: 44rem) { … }` |
| `group` + `group-hover:` · `peer-checked:` | 부모 모듈 클래스로: `.row:hover .icon { … }` · `.box:checked ~ .mark { … }` |
| `[:root[data-role=system]_&]:` | `:root[data-role='system'] & { … }` |
| `truncate` · `sr-only` · `transition-colors duration-200` | `@include truncate` · `@include sr-only` · `@include transition-colors(200ms)` |
| `space-y-3` · `divide-y` | `& > :not(:last-child) { margin-block-end: sp(3); }` · `… { border-bottom: 1px solid var(--border); }` — 자식이 자기 여백을 가지면 `:where()`로 감싸 특이도를 0으로 둔다 |

---

## 6. 덮어쓰기 — CSS 레이어가 `tailwind-merge`를 대신한다

Tailwind 시절 `cn(BASE, '호출부 클래스')`는 `tailwind-merge`가 «뒤에 쓴 것이 이긴다»로 정리했다. SCSS 모듈에는 그 기능이 없고 **파일 사이의 선언 순서는 보장되지 않는다.** 그래서 이긴 쪽을 **레이어와 특이도**로 정한다.

| 무엇 | 어디 | 결과 |
|---|---|---|
| **덮어써질 수 있는 스타일** — 공용 부품(`shared/ui`)·클래스 상수(`ACTION_BUTTON` · `BADGE_BASE` · `SEG_*` · `TABLE_*` · `STATUS_VISUAL` …)·`className`/`…ClassName`을 받는 컴포넌트의 뼈대 | `@layer components { … }` | 호출부가 덮는다 |
| 그 밖의 모듈 스타일(화면·위젯 고유) | 레이어 없이 | 레이어 안 규칙을 **특이도와 무관하게** 이긴다 |
| 전역 도움 클래스(§7) | 레이어 없이 + 선택자 앞 `:root` | 모듈 클래스(0,1,0)를 **파일 순서와 무관하게** 이긴다 |

### 6.1 레이어 순서는 모듈마다 먼저 선언한다

한 번들 안에서 모듈 CSS가 `globals`보다 앞에 실리면 레이어 순서가 «처음 본 차례»로 굳는다 — `components`가 초기화(`base`)보다 앞에 서서 **초기화의 `padding: 0` · `border: 0`이 부품의 여백과 테두리를 지웠다**(실측: 390px 통합 관제가 205px 짧아졌다). `_layers.scss`가 `@layer base, components;`를 모듈마다 먼저 싣는다.

### 6.2 hover를 가진 공용 부품 위에 색을 얹으면 hover를 다시 적는다

공용 규칙은 `components` 레이어라 **레이어 없는 호출부의 `color`가 공용 `:hover` 색까지 이긴다** — Tailwind 시절에는 `hover:`의 특이도가 이겼다. `ACTION_BUTTON*` · `ACTION_LINK` · `ICON_BUTTON` · `SEG_ITEM_OFF`(또는 hover가 있는 공용 부품) 위에 색·배경·테두리색을 얹으면 호출부 모듈에서 hover를 다시 적는다.

```scss
/* 레이어 밖의 색이 `ICON_BUTTON`의 hover 색까지 이기므로 hover를 다시 적는다 */
.trigger {
  color: var(--fg-muted);
  @include hover { &:hover { color: var(--fg); background-color: var(--surface-2); } }
}
```

**화면 캡처로는 잡히지 않는다**(정지 화면에 hover가 없다). 전환 때 10곳을 전수 점검했다.

### 6.3 공용 부품의 상태·반응형 규칙도 호출부가 덮는다

공용 뿌리의 `lg` 여백·hover·`:first-child` 규칙도 `components` 레이어 안이다. 호출부가 **같은 속성**을 레이어 없이 주면 그 규칙들까지 이긴다 — 의도가 아니면 호출부에서 같은 조건을 다시 적는다.

---

## 7. 전역 도움 클래스 — 문자열로 쓴다

`globals.scss`에 있고 모듈로 옮기지 않는다: `num` · `role-hide-*` · `role-only-*` · `admin-only-*` · `role-pick-*` · `admin-pick-*` · `theme-when-dark` · `theme-when-light` · `scroll-hint` · `login-glass` · `text-gradient` · `process-flow` · `num-fade` · `live-pulse` · **`pulse`** · **`pulse-motion-safe`** · `wall-*`(현황판).

```tsx
<span className={cn(styles.value, 'num')} />
<div className={cn('role-hide-site', styles.column)} />
```

- **역할·테마 숨김이 모듈에 지지 않는다** — 레이어 밖 + `:root` 접두(특이도 0,2,0 이상)라 `display`를 주는 모듈 클래스와 한 요소에 써도 숨김이 이긴다. 레이어 안에 두면 **다른 역할의 화면이 보인다**(전환 중 실제로 짚였다).
- **애니메이션은 모듈에 적지 않는다.** CSS 모듈은 `animation`의 이름을 파일마다 바꿔 붙여, 모듈 안의 `animation: pulse`는 키프레임을 찾지 못해 **조용히 멈춘다** — 화면 대조도 애니메이션을 끄고 찍어 이것을 잡지 못한다. 전역 클래스를 쓴다(`animate-pulse` → `pulse`, `motion-safe:animate-pulse` → `pulse-motion-safe`).

---

## 8. 하지 않는 것

- 마크업(요소·순서·`aria-*`·`data-*`)을 스타일 때문에 바꾸지 않는다. 동적 값은 인라인 `style`로 둔다.
- 색·간격을 새로 만들지 않는다 — 새 토큰이 필요하면 `globals.scss`와 `screens.md` §8에 먼저 등재한다.
- 역할별 화면을 `useRole()`로 고르지 않는다 — 세 벌을 그리고 전역 클래스가 고른다(하이드레이션).
- 소스 글자를 읽는 테스트는 **Tailwind 문자열이 아니라 모듈 규칙**을 읽는다(`responsive-surface.test.ts`가 예다). jsdom은 스타일시트를 적용하지 않는다.

---

## 9. 확인

- `npx tsc --noEmit` · `npx eslint src` · `npx vitest run` · `npx next build`
- 화면을 바꾸지 않는 작업이면 **전후 캡처를 픽셀로 대조한다** — 시계를 고정하고 계측 서버를 막아(내장 데이터) 같은 코드면 같은 그림이 나오게 한 뒤 찍는다.
- **dev 서버를 새로 띄운 뒤 대조한다.** 공용 상수 파일을 고친 뒤 서버 쪽 캐시가 낡아 **옛 클래스로 HTML을 그린 적이 있다**(하이드레이션 경고 «1 Issue»). 그 상태의 캡처는 옛 스타일을 다시 찍은 것이라 무효다.
