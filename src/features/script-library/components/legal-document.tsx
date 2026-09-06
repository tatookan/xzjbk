import { LibraryHeader } from '@/features/script-library/components/library-header';
import Link from 'next/link';

interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

interface LegalDocumentProps {
  title: string;
  englishTitle: string;
  updatedAt: string;
  introduction: string;
  sections: LegalSection[];
}

export function LegalDocument({
  title,
  englishTitle,
  updatedAt,
  introduction,
  sections
}: LegalDocumentProps) {
  return (
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
      <LibraryHeader />
      <article className='mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:py-20'>
        <header className='border-b border-white/10 pb-10'>
          <p className='text-[11px] tracking-[0.22em] text-[#d84a3f] uppercase'>{englishTitle}</p>
          <h1 className='mt-4 font-serif text-5xl tracking-[-0.05em] sm:text-6xl'>{title}</h1>
          <p className='mt-5 text-xs text-white/32'>更新日期：{updatedAt}</p>
          <p className='mt-8 max-w-3xl text-[15px] leading-8 text-white/58'>{introduction}</p>
        </header>

        <div className='space-y-12 py-12'>
          {sections.map((section, index) => (
            <section key={section.title} className='grid gap-5 sm:grid-cols-[64px_1fr]'>
              <span className='font-mono text-xs text-[#d84a3f]'>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className='font-serif text-2xl tracking-[-0.025em]'>{section.title}</h2>
                <div className='mt-4 space-y-4 text-sm leading-7 text-white/52'>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items?.length ? (
                    <ul className='space-y-3 border-l border-white/12 pl-5'>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer className='flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-white/32 sm:flex-row sm:items-center sm:justify-between'>
          <p>如对条款有疑问，请通过平台公布的运营联系方式与我们联系。</p>
          <Link
            href='/scripts'
            className='shrink-0 text-white/56 transition-colors hover:text-white'
          >
            返回剧本库
          </Link>
        </footer>
      </article>
    </main>
  );
}
