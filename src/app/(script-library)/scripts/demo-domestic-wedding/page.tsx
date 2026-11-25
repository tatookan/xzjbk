import { PerformanceScriptDetail } from '@/features/script-library/components/performance-script-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '婚礼上，我放出未婚夫和闺蜜的秘密 | 国内剧本 | 新梦剧本库'
};

export default function PerformancePreviewPage() {
  return <PerformanceScriptDetail />;
}
