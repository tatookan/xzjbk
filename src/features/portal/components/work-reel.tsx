'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface PortalPoster {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkHref: string | null;
}

const fallbackWorks: PortalPoster[] = [
  {
    id: 'fallback-mirror',
    title: '镜中裁决',
    subtitle: '都市悬疑',
    imageUrl: '/portal/cover-mirror.jpg',
    linkHref: null
  },
  {
    id: 'fallback-sword',
    title: '云外问剑',
    subtitle: '东方幻想',
    imageUrl: '/portal/cover-sword.jpg',
    linkHref: null
  },
  {
    id: 'fallback-noir',
    title: '夜行证词',
    subtitle: '近未来罪案',
    imageUrl: '/portal/cover-noir.jpg',
    linkHref: null
  },
  {
    id: 'fallback-letter',
    title: '长夜来信',
    subtitle: '年代悬疑',
    imageUrl: '/portal/cover-letter.jpg',
    linkHref: null
  }
];

function Cover({ poster, duplicate }: { poster: PortalPoster; duplicate: boolean }) {
  const content = (
    <>
      <Image
        src={poster.imageUrl}
        alt={duplicate ? '' : `${poster.title}漫剧封面`}
        fill
        unoptimized={poster.imageUrl.startsWith('/api/')}
        sizes='(max-width: 640px) 68vw, 25vw'
        className='object-cover'
      />
      <div className='portal-cover-copy'>
        {poster.subtitle ? <p>{poster.subtitle}</p> : null}
        <h3>{poster.title}</h3>
      </div>
    </>
  );

  return poster.linkHref ? (
    <a
      href={poster.linkHref}
      target={poster.linkHref.startsWith('http') ? '_blank' : undefined}
      rel={poster.linkHref.startsWith('http') ? 'noreferrer' : undefined}
      className='portal-cover'
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
    >
      {content}
    </a>
  ) : (
    <article className='portal-cover' aria-hidden={duplicate || undefined}>
      {content}
    </article>
  );
}

export function WorkReel() {
  const [works, setWorks] = useState<PortalPoster[]>(fallbackWorks);
  const [managed, setManaged] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/showcase-posters', { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { items: PortalPoster[] };
        };
        if (response.ok && payload.success && payload.data) {
          setWorks(payload.data.items);
          setManaged(true);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (managed && works.length === 0) {
    return (
      <div className='mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-12'>
        <div className='border-y border-black/15 py-14 text-center'>
          <p className='text-sm text-black/45'>新的作品海报正在准备中</p>
        </div>
      </div>
    );
  }

  return (
    <div className='portal-reel-shell'>
      <div className='portal-reel-track'>
        {[...works, ...works].map((work, index) => (
          <Cover key={`${work.id}-${index}`} poster={work} duplicate={index >= works.length} />
        ))}
      </div>
    </div>
  );
}
