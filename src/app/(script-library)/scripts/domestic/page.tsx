import { LibraryHome } from '@/features/script-library/components/library-home';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '国内剧本 | 新梦剧本库' };

export default function DomesticScriptsPage() {
  return <LibraryHome market='domestic' />;
}
