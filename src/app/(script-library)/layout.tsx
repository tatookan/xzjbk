import { ScriptLibraryDemoProvider } from '@/features/script-library/components/demo-context';
import { LibraryThemeProvider } from '@/features/script-library/components/library-theme';

export default function ScriptLibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <LibraryThemeProvider>
      <ScriptLibraryDemoProvider>{children}</ScriptLibraryDemoProvider>
    </LibraryThemeProvider>
  );
}
