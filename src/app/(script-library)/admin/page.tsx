import { AdminDashboard } from '@/features/script-library/components/admin-dashboard';
import { getSession } from '@/modules/identity/session';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: '管理后台 | 新梦剧本库' };

export default async function AdminPage() {
  const session = await getSession(await headers());
  if (!session || session.user.role !== 'admin') redirect('/login');
  return <AdminDashboard />;
}
