import type { Metadata } from 'next';
import { BRAND_NAME } from '@/shared/config/constants';
import { LoginView } from '@/widgets/login-view';

export const metadata: Metadata = {
  title: `로그인 — ${BRAND_NAME}`,
};

export default function LoginPage() {
  return <LoginView />;
}
