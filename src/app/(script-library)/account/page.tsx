import { AccountScreen } from '@/features/script-library/components/account-screen';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '我的剧本 | 心智剧本库' };

export default function AccountPage() {
  return <AccountScreen />;
}
