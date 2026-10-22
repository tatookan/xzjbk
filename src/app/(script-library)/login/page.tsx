import { LoginScreen } from '@/features/script-library/components/login-screen';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '登录 | 心梦剧本库' };

export default function LoginPage() {
  return <LoginScreen />;
}
