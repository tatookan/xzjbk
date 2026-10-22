import Link from 'next/link';

export default function NotFound() {
  return (
    <main className='flex min-h-dvh items-center justify-center bg-[#0b0c0e] px-6 text-[#f4f0e8]'>
      <div className='w-full max-w-2xl border-t border-white/15 pt-8'>
        <p className='font-mono text-xs tracking-[0.28em] text-white/45'>404 · PAGE NOT FOUND</p>
        <h1 className='mt-6 max-w-xl text-5xl leading-[0.96] font-medium tracking-[-0.055em] sm:text-7xl'>
          这一幕还没有被写下。
        </h1>
        <p className='mt-6 max-w-lg text-sm leading-7 text-white/55'>
          页面可能已经移动，或这个地址尚未开放。你可以返回心梦门户，继续浏览作品与剧本。
        </p>
        <div className='mt-10 flex flex-wrap gap-3'>
          <Link
            href='/'
            className='inline-flex min-h-11 items-center rounded-full bg-[#f3efe6] px-5 text-sm font-medium text-[#141518] transition-transform hover:-translate-y-0.5'
          >
            返回门户
          </Link>
          <Link
            href='/scripts'
            className='inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white/80 transition-colors hover:border-white/55 hover:text-white'
          >
            浏览剧本库
          </Link>
        </div>
      </div>
    </main>
  );
}
