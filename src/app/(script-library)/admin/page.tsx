import { AdminDashboard } from '@/features/script-library/components/admin-dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '管理后台 | 心智剧本库' };

export default function AdminPage() {
  return <AdminDashboard />;
}
