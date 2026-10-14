'use client';

import { Icons } from '@/components/icons';
import Image from 'next/image';
import { useRef, useState } from 'react';

const showcaseVideos = [
  {
    id: '01',
    src: '/portal/pv-01.mp4',
    poster: '/portal/pv-01-poster.jpg'
  },
  {
    id: '02',
    src: '/portal/pv-02.mp4',
    poster: '/portal/pv-02-poster.jpg'
  }
] as const;

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPlayAttemptedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const activeVideo = showcaseVideos[activeIndex];

  const activateVideo = (index: number) => {
    autoPlayAttemptedRef.current = false;
    setReady(false);
    setHasStarted(false);
    setPlaying(false);
    setMuted(true);
    setActiveIndex(index);
  };

  const selectVideo = (index: number) => {
    if (index !== activeIndex) activateVideo(index);
  };

  const playNextVideo = () => {
    activateVideo((activeIndex + 1) % showcaseVideos.length);
  };

  const startWhenReady = async () => {
    const video = videoRef.current;
    if (!video || autoPlayAttemptedRef.current) return;

    autoPlayAttemptedRef.current = true;
    setReady(true);
    video.muted = true;
    setMuted(true);
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  };

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const enterFullscreen = async () => {
    await videoRef.current?.requestFullscreen?.();
  };

  return (
    <div className='absolute inset-0 overflow-hidden bg-[#111216]'>
      <Image
        key={activeVideo.poster}
        src={activeVideo.poster}
        alt=''
        fill
        priority={activeIndex === 0}
        sizes='100vw'
        className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
          hasStarted ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {/* The supplied PV masters contain captions rendered directly into the picture. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={activeVideo.src}
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
          hasStarted ? 'opacity-100' : 'opacity-0'
        }`}
        muted={muted}
        playsInline
        preload='auto'
        onCanPlay={() => void startWhenReady()}
        onPlay={() => {
          setHasStarted(true);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={playNextVideo}
        onError={() => {
          setReady(false);
          setPlaying(false);
        }}
      >
        <source src={activeVideo.src} type='video/mp4' />
      </video>
      <div className='portal-video-shade absolute inset-0' />

      <div
        className='absolute top-24 right-5 z-20 flex items-center rounded-full border border-white/18 bg-black/35 p-1 backdrop-blur-md sm:right-8'
        aria-label='选择首页展示 PV'
      >
        {showcaseVideos.map((video, index) => (
          <button
            key={video.id}
            type='button'
            onClick={() => selectVideo(index)}
            aria-pressed={activeIndex === index}
            aria-label={`播放 PV ${video.id}`}
            className={`min-w-12 rounded-full px-3 py-2 font-mono text-[10px] tracking-[0.15em] transition-colors ${
              activeIndex === index
                ? 'bg-[#f3efe6] text-[#151619]'
                : 'text-white/55 hover:text-white'
            }`}
          >
            PV {video.id}
          </button>
        ))}
      </div>

      <div className='absolute right-5 bottom-5 z-20 flex gap-2 sm:right-8 sm:bottom-8'>
        <button
          type='button'
          onClick={togglePlayback}
          disabled={!ready}
          className='portal-media-button'
          aria-label={!ready ? 'PV 加载中' : playing ? '暂停 PV' : '播放 PV'}
        >
          {playing ? <Icons.pause size={17} /> : <Icons.play size={17} />}
        </button>
        <button
          type='button'
          onClick={toggleSound}
          disabled={!hasStarted}
          className='portal-media-button'
          aria-label={muted ? '开启声音' : '关闭声音'}
        >
          {muted ? <Icons.volumeOff size={17} /> : <Icons.volume size={17} />}
        </button>
        <button
          type='button'
          onClick={enterFullscreen}
          disabled={!hasStarted}
          className='portal-media-button hidden sm:grid'
          aria-label='全屏播放 PV'
        >
          <Icons.maximize size={17} />
        </button>
      </div>
    </div>
  );
}
