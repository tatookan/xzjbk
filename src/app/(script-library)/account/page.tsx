import { AccountScreen } from '@/features/script-library/components/account-screen';
import { getSession } from '@/modules/identity/session';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: '我的剧本 | 心智剧本库' };

export default async function AccountPage() {
  const session = await getSession(await headers());
  if (!session) redirect('/login');
  return <AccountScreen />;
}
