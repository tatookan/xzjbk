'use client';

import { Icons } from '@/components/icons';
import { XinzhiBrand } from '@/components/xinzhi-brand';
import { authClient } from '@/modules/identity/auth-client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(formData.get('password') ?? '');

    try {
      if (mode === 'register') {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: String(formData.get('name') ?? ''),
            email,
            password,
            inviteCode: String(formData.get('inviteCode') ?? ''),
            acceptedPolicies
          })
        });
        const payload = (await response.json()) as {
          success: boolean;
          error?: { message?: string };
        };
        if (!response.ok || !payload.success) {
          setMessage(payload.error?.message ?? '注册失败，请稍后重试');
          return;
        }
      }

      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setMessage(
          mode === 'register'
            ? '账号已创建，但自动登录失败，请切换到账号登录重试'
            : '邮箱或密码不正确'
        );
        return;
      }

      router.replace(result.data?.user.role === 'admin' ? '/admin' : '/scripts');
      router.refresh();
    } catch {
      setMessage('当前无法连接登录服务，请稍后重试');
    } finally {
      setSubmitting(false);
    }
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
          <Link href='/' className='flex items-center gap-3' aria-label='返回心梦门户'>
            <XinzhiBrand descriptor='SCRIPT LIBRARY' markSize={36} />
          </Link>
          <Link
            href='/scripts'
            className='text-sm text-white/48 transition-colors hover:text-white'
          >
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
                  setAcceptedPolicies(false);
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
            {mode === 'register' ? (
              <label className='block text-sm text-white/66'>
                姓名或称呼
                <input
                  name='name'
                  autoComplete='name'
                  minLength={2}
                  maxLength={50}
                  required
                  className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
                />
              </label>
            ) : null}
            <label className='block text-sm text-white/66'>
              邮箱
              <input
                name='email'
                type='email'
                autoComplete='email'
                required
                className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
              />
            </label>
            <label className='block text-sm text-white/66'>
              密码
              <input
                name='password'
                type='password'
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                maxLength={128}
                required
                className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
              />
            </label>
            {mode === 'register' ? (
              <>
                <label className='block text-sm text-white/66'>
                  注册码
                  <input
                    name='inviteCode'
                    autoComplete='off'
                    minLength={12}
                    maxLength={64}
                    required
                    className='mt-2 h-12 w-full border border-white/14 bg-white/[0.035] px-4 font-mono text-white uppercase outline-none transition-colors focus:border-[#d84a3f]'
                  />
                  <span className='mt-2 block text-xs leading-5 text-white/35'>
                    每个注册码仅可绑定一个账号，使用后立即失效。
                  </span>
                </label>
                <div className='flex items-start gap-3 text-xs leading-5 text-white/46'>
                  <input
                    id='acceptedPolicies'
                    type='checkbox'
                    checked={acceptedPolicies}
                    onChange={(event) => setAcceptedPolicies(event.target.checked)}
                    required
                    className='mt-0.5 size-4 shrink-0 accent-[#d84a3f]'
                  />
                  <span>
                    <label htmlFor='acceptedPolicies' className='cursor-pointer'>
                      我已阅读并同意
                    </label>
                    <Link
                      href='/terms'
                      target='_blank'
                      className='mx-1 text-white/72 underline decoration-white/25 underline-offset-4 hover:text-white'
                    >
                      《用户协议》
                    </Link>
                    和
                    <Link
                      href='/privacy'
                      target='_blank'
                      className='ml-1 text-white/72 underline decoration-white/25 underline-offset-4 hover:text-white'
                    >
                      《隐私政策》
                    </Link>
                  </span>
                </div>
              </>
            ) : null}

            {message ? (
              <p role='alert' className='flex items-center gap-2 text-sm text-[#ff8075]'>
                <Icons.alertCircle size={16} /> {message}
              </p>
            ) : null}

            <button
              type='submit'
              disabled={submitting || (mode === 'register' && !acceptedPolicies)}
              className='flex h-12 w-full items-center justify-center gap-2 bg-[#d84a3f] text-sm font-semibold text-[#130f0f] transition-colors hover:bg-[#e05d52] disabled:cursor-wait disabled:opacity-55'
            >
              {submitting
                ? mode === 'login'
                  ? '正在登录…'
                  : '正在验证…'
                : mode === 'login'
                  ? '登录剧本库'
                  : '验证并注册'}
              <Icons.arrowRight size={17} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
