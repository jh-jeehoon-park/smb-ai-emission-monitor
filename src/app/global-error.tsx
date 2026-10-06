'use client';

import { useEffect } from 'react';
import { THEME_STORAGE_KEY, normalizeTheme } from '@/shared/config/theme';
import { NOTICE_ERROR, NOTICE_RETRY_LABEL } from '@/shared/config/notices';

/**
 * root layout까지 무너졌을 때의 마지막 화면 `[사용자 요청 2026-09-15]`.
 *
 * **이 파일은 문서를 통째로 대신한다** — `<html>`·`<body>`를 직접 그려야 하고, 그 대가로
 * **`globals.css`가 적용되지 않는다**(Next 문서가 못박는다). 그래서 여기서는 토큰(`--fg`·
 * `--surface`…)이 아무 값도 갖지 않는다 — `Notice`·`BrandMark` 같은 부품을 쓸 수 없고,
 * R9(토큰만 쓴다)가 성립하지 않는 **이 저장소의 유일한 자리**다.
 *
 * **그래서 색을 손으로 적는다.** 팔레트는 `globals.css`의 `--bg`·`--surface`·`--fg`·
 * `--fg-muted`·`--border`·`--accent`에서 그대로 베껴 온 여섯 값이고, 아래 `<style>` 안에만 산다.
 * 값이 갈릴 위험이 있지만 **그것이 이 화면이 뜨는 상황보다 낫다** — 앱이 무너진 마당에
 * 스타일시트를 불러오려다 또 무너지는 것이 더 나쁘다.
 *
 * **테마를 `<head>` 스크립트로 붙일 수 없다** `[설계 2026-09-16: 리다이렉트 검토]`. 셸이 쓰는
 * `THEME_INIT_SCRIPT`를 여기 `<script>`로 그려 봤는데 **한 번도 돌지 않았다** — React가 렌더한
 * 스크립트는 실행되지 않는다(실측: 다크로 두고 열어도 `data-theme`이 `null`이고 배경이 흰색).
 * 그래서 effect가 마운트 뒤에 속성을 붙인다 — **다크는 한 프레임 늦게 온다.** 앱이 무너진
 * 화면에서 그 한 프레임을 아끼려고 팔레트를 또 복제하지는 않는다.
 *
 * OS 설정(`prefers-color-scheme`)은 그와 별개로 먼저 받으므로, 스크립트가 아니라 **저장된
 * 선택만** 이 effect에 달려 있다.
 *
 * `metadata`를 export할 수 없다(에러 바운더리는 Client Component다) — `<title>`을 직접 그린다.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    try {
      document.documentElement.setAttribute(
        'data-theme',
        normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)),
      );
    } catch {
      /* 저장소가 막힌 브라우저 — 라이트로 둔다(`DEFAULT_THEME`과 같은 방향이다) */
    }
  }, []);

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <title>{`${NOTICE_ERROR.code} · ${NOTICE_ERROR.title}`}</title>
        <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      </head>
      <body>
        <main>
          <p className="code">{NOTICE_ERROR.code}</p>
          <h1>{NOTICE_ERROR.title}</h1>
          <p className="desc">{NOTICE_ERROR.description}</p>
          <button type="button" onClick={() => retry()}>
            {NOTICE_RETRY_LABEL}
          </button>
          {error.digest && <p className="digest">오류 번호 {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}

/**
 * `globals.css`에서 베낀 여섯 값. **라이트가 기본이고 다크가 덮는다** — 스크립트가 막힌
 * 순간에도 읽히게 하려는 것이며 `globals.css`가 이미 그 방향이다.
 */
const STYLE = `
:root{--bg:#f1f4f8;--surface:#ffffff;--fg:#0f1620;--fg-muted:#48566a;--border:#e3e8ef;--accent:#0d47a1}
@media (prefers-color-scheme: dark){:root:not([data-theme='light']){--bg:#070b11;--surface:#0e141c;--fg:#e8eef4;--fg-muted:#a3b4c2;--border:#1e2937;--accent:#64b5f6}}
:root[data-theme='dark']{--bg:#070b11;--surface:#0e141c;--fg:#e8eef4;--fg-muted:#a3b4c2;--border:#1e2937;--accent:#64b5f6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}
main{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center}
.code{margin:0;font-size:44px;font-weight:700;line-height:1;color:var(--fg-muted)}
h1{margin:0;font-size:18px;font-weight:700;line-height:1.3}
.desc{margin:0;max-width:46ch;font-size:13px;color:var(--fg-muted)}
.digest{margin:4px 0 0;font-size:12px;color:var(--fg-muted)}
button{margin-top:8px;padding:6px 14px;font:inherit;font-size:12px;font-weight:500;color:var(--fg);background:var(--surface);border:1px solid var(--border);border-radius:6px;cursor:pointer}
button:hover{color:var(--accent);border-color:var(--accent)}
`;
