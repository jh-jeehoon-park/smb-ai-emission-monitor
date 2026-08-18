'use client';

import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { DEMO_ACCOUNT } from '@/shared/config/demo';
import { BrandMark } from '@/shared/ui/brand-mark';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { ThemeToggle } from '@/shared/ui/theme';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { useRole } from '@/entities/user';
import { BrandPanel } from './brand-panel';

/**
 * 시연 계정 하나로 들어간다. 역할은 여기서 고르지 않는다 — 계정이 하나라
 * 역할 선택을 로그인에 두면 그것이 인증처럼 읽힌다. 전환은 헤더 프로필 메뉴에 있다.
 *
 * 상태색(정상·주의·경고·위험)을 장식으로 쓰지 않는다. 이 시스템에서 색은 상태를
 * 뜻하므로 첫 화면에 장식 색을 두면 그 규칙이 시작부터 깨진다. 대비는 색이 아니라
 * 면적·명도로 만든다.
 */
export function LoginView() {
  const { signIn } = useRole();
  const [id, setId] = useState<string>(DEMO_ACCOUNT.id);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNT.password);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signIn();
  };

  return (
    <main className="min-h-screen bg-bg">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* 우측을 좁게 잡는다. 폼 폭은 368px 고정이라 열이 넓으면 여백만 늘어 화면이 빈다 */}
      <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(400px,520px)]">
        <BrandPanel />

        <section className="flex items-center justify-center px-5 py-14 sm:px-10">
          <StaggerGroup className="w-full max-w-[368px]">
            {/* 좌측 패널이 없는 폭에서는 여기가 유일한 브랜드 자리다 */}
            <RiseItem className="lg:hidden">
              <div className="mb-8 flex items-center gap-2.5">
                <BrandMark size={36} />
                <div className="min-w-0">
                  <h1 className="break-keep text-[15px] font-semibold leading-[1.35] tracking-tight text-fg">
                    {BRAND_NAME}
                  </h1>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">
                    AIoT 기반 소규모 사업장 오염물질 배출 관리
                  </p>
                </div>
              </div>
            </RiseItem>

            <RiseItem>
              <Eyebrow>Sign in</Eyebrow>
              <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-fg">
                운영 대시보드 로그인
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
                시연 계정이 입력되어 있습니다. 로그인하면{' '}
                <strong className="font-semibold text-fg">운영자</strong>로 들어가며, 역할은 오른쪽
                위 계정 메뉴에서 바꿉니다.
              </p>
            </RiseItem>

            <RiseItem>
              <form onSubmit={submit} className="mt-7 space-y-3.5">
                <Field
                  id="account-id"
                  label="아이디"
                  value={id}
                  onChange={setId}
                  autoComplete="username"
                />
                <Field
                  id="account-password"
                  label="비밀번호"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />

                {/* 상태색을 쓸 수 없으므로 CTA의 무게는 명도 대비로 만든다 */}
                <button
                  type="submit"
                  className="group flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[5px] bg-fg px-3 py-3 text-[13px] font-semibold text-bg transition-opacity duration-200 hover:opacity-88"
                >
                  로그인
                  <ArrowRight
                    aria-hidden
                    size={14}
                    strokeWidth={2.2}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </button>
              </form>
            </RiseItem>

            <RiseItem>
              <div className="mt-7 rounded-[5px] border border-border bg-surface p-3.5">
                {/* 없는 것을 있는 척하지 않는다. 원문이 규정한 인증 방식과 현재 상태를 함께 적는다 */}
                <p className="text-[11px] font-semibold text-fg-muted">실제 인증이 아닙니다</p>
                <p className="mt-1 text-[11px] leading-relaxed text-fg-subtle">
                  원문은 OAuth 2.0 + JWT를 규정하지만(사업계획서 p.69) 백엔드가 없어 계정 확인
                  절차가 없습니다. 역할 전환도 인가가 아니라 시연 표시입니다.
                </p>
              </div>
            </RiseItem>
          </StaggerGroup>
        </section>
      </div>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  autoComplete?: string;
}

function Field({ id, label, value, onChange, type = 'text', autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] text-fg-subtle">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-[5px] border border-border bg-surface px-3 py-2.5 text-[13px] text-fg outline-none transition-colors duration-200 hover:border-border-strong focus:border-fg-subtle"
      />
    </div>
  );
}
