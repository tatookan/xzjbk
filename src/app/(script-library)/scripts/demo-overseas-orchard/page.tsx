import { OverseasPerformanceDetail } from '@/features/script-library/components/overseas-performance-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'They Tried to Erase My Name from the Orchard | 海外剧本 | 新梦剧本库'
};

export default function OverseasPerformancePreviewPage() {
  return <OverseasPerformanceDetail />;
}
