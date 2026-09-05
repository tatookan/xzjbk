import Image from 'next/image';

const works = [
  { title: '镜中裁决', genre: '都市悬疑', image: '/portal/cover-mirror.jpg' },
  { title: '云外问剑', genre: '东方幻想', image: '/portal/cover-sword.jpg' },
  { title: '夜行证词', genre: '近未来罪案', image: '/portal/cover-noir.jpg' },
  { title: '长夜来信', genre: '年代悬疑', image: '/portal/cover-letter.jpg' }
];

export function WorkReel() {
  return (
    <div className='portal-reel-shell'>
      <div className='portal-reel-track'>
        {[...works, ...works].map((work, index) => (
          <article
            key={`${work.title}-${index}`}
            className='portal-cover'
            aria-hidden={index >= works.length ? true : undefined}
          >
            <Image
              src={work.image}
              alt={index < works.length ? `${work.title}漫剧封面` : ''}
              fill
              sizes='(max-width: 640px) 68vw, 25vw'
              className='object-cover'
            />
            <div className='portal-cover-copy'>
              <p>{work.genre}</p>
              <h3>{work.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
