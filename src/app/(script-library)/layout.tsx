import { ScriptLibraryDemoProvider } from '@/features/script-library/components/demo-context';

export default function ScriptLibraryLayout({ children }: { children: React.ReactNode }) {
  return <ScriptLibraryDemoProvider>{children}</ScriptLibraryDemoProvider>;
}
