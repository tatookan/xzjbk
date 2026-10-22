import { LibraryHome } from '@/features/script-library/components/library-home';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '剧本库 | 心梦' };

export default function ScriptsPage() {
  return <LibraryHome />;
}
