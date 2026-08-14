import type { Metadata } from 'next';
import { LoginView } from '@/widgets/login-view';

export const metadata: Metadata = {
  title: '로그인 — AI 기반 지능형 배출관리 플랫폼',
};

export default function LoginPage() {
  return <LoginView />;
}
