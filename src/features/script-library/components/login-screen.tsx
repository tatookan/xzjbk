'use client';

import { Icons } from '@/components/icons';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const router = useRouter();
  const { loginAs, register } = useScriptLibraryDemo();
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    if (mode === 'login') {
      loginAs('member');
      router.push('/scripts');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const result = register(String(formData.get('inviteCode') ?? ''));
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.push('/scripts');
  };

  const enterAdmin = () => {
    loginAs('admin');
    router.push('/admin');
  };

  return (
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8] lg:grid lg:grid-cols-[0.9fr_1.1fr]'>
      <section className='relative hidden min-h-screen overflow-hidden lg:block'>
        <Image
          src='/portal/cover-mirror.jpg'
          alt='镜中裁决剧本封面'
          fill
          priority
          className='object-cover object-center'
          sizes='45vw'
        />
        <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,12,.12),rgba(10,10,12,.86))]' />
        <div className='absolute inset-x-0 bottom-0 p-12 xl:p-16'>
          <p className='mb-4 text-[11px] tracking-[0.28em] text-[#e56a5f] uppercase'>
            Curated Script Library
          </p>
          <blockquote className='max-w-xl font-serif text-4xl leading-[1.05] tracking-[-0.035em] xl:text-5xl'>
            好故事值得被认真选择，也值得只属于一个制作团队。
          </blockquote>
        </div>
      </section>

      <section className='flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24'>
        <div className='flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-3' aria-label='返回心智门户'>
            <span className='grid size-9 place-items-center border border-white/70 text-[11px] font-semibold tracking-[-0.08em]'>
              心智
            </span>
            <span className='text-[11px] tracking-[0.2em] text-white/44'>SCRIPT LIBRARY</span>
          </Link>
          <Link href='/scripts' className='text-sm text-white/48 transition-colors hover:text-white'>
            先浏览剧本
          </Link>
        </div>

        <div className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16'>
          <p className='mb-4 text-[11px] tracking-[0.24em] text-[#d84a3f] uppercase'>白名单访问</p>
          <h1 className='font-serif text-5xl leading-none tracking-[-0.05em] sm:text-6xl'>
            {mode === 'login' ? '欢迎回来' : '加入剧本库'}
          </h1>
          <p className='mt-5 text-sm leading-6 text-white/52'>
            {mode === 'login'
              ? '登录后可查看导演阐述与中英对照试读，并购买独家剧本。'
              : '剧本库采用邀请制注册，每个注册码仅可使用一次。'}
          </p>

          <div className='mt-9 grid grid-cols-2 border-b border-white/12 text-sm'>
            {(['login', 'register'] as Mode[]).map((item) => (
              <button
                key={item}
                type='button'
                onClick={() => {
                  setMode(item);
                  setMessage('');
                }}
                className={`border-b py-3 transition-colors ${
                  mode === item
                    ? 'border-[#d84a3f] text-white'
                    : 'border-transparent text-white/42 hover:text-white/72'
                }`}
              >
                {item === 'login' ? '账号登录' : '注册码注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className='mt-7 space-y-5'>
            <label className='block text-sm text-white/66'>
              邮箱
              <input
                name='email'
                type='email'
                required
                defaultValue='shen@xinzhi.demo'
                className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
              />
            </label>
            <label className='block text-sm text-white/66'>
              密码
              <input
                name='password'
                type='password'
                required
                defaultValue='demo123456'
                className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
              />
            </label>
            {mode === 'register' ? (
              <label className='block text-sm text-white/66'>
                注册码
                <input
                  name='inviteCode'
                  required
                  defaultValue='XINZHI-2026'
                  className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 font-mono text-white uppercase outline-none transition-colors focus:border-[#d84a3f]'
                />
                <span className='mt-2 block text-xs text-white/35'>演示注册码：XINZHI-2026</span>
              </label>
            ) : null}

            {message ? (
              <p className='flex items-center gap-2 text-sm text-[#ff8075]'>
                <Icons.alertCircle size={16} /> {message}
              </p>
            ) : null}

            <button
              type='submit'
              className='flex h-12 w-full items-center justify-center gap-2 bg-[#d84a3f] text-sm font-semibold text-[#130f0f] transition-colors hover:bg-[#e05d52]'
            >
              {mode === 'login' ? '登录剧本库' : '验证并注册'}
              <Icons.arrowRight size={17} />
            </button>
          </form>

          <div className='mt-8 border-t border-white/10 pt-6'>
            <p className='mb-3 text-xs text-white/34'>UI 验证快捷入口</p>
            <button
              type='button'
              onClick={enterAdmin}
              className='flex w-full items-center justify-between border border-white/12 px-4 py-3 text-sm text-white/65 transition-colors hover:border-white/32 hover:text-white'
            >
              以管理员身份进入后台
              <Icons.chevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
