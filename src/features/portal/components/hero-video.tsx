'use client';

import { Icons } from '@/components/icons';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const activeVideo = showcaseVideos[activeIndex];

  const selectVideo = (index: number) => {
    if (index === activeIndex) return;

    setActiveIndex(index);
    setPlaying(true);
  };

  const playNextVideo = () => {
    setActiveIndex((current) => (current + 1) % showcaseVideos.length);
    setPlaying(true);
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
      {/* The supplied PV masters contain captions rendered directly into the picture. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={activeVideo.src}
        ref={videoRef}
        className='portal-video-enter h-full w-full object-cover'
        autoPlay
        muted={muted}
        playsInline
        preload='metadata'
        poster={activeVideo.poster}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={playNextVideo}
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
          className='portal-media-button'
          aria-label={playing ? '暂停 PV' : '播放 PV'}
        >
          {playing ? <Icons.pause size={17} /> : <Icons.play size={17} />}
        </button>
        <button
          type='button'
          onClick={toggleSound}
          className='portal-media-button'
          aria-label={muted ? '开启声音' : '关闭声音'}
        >
          {muted ? <Icons.volumeOff size={17} /> : <Icons.volume size={17} />}
        </button>
        <button
          type='button'
          onClick={enterFullscreen}
          className='portal-media-button hidden sm:grid'
          aria-label='全屏播放 PV'
        >
          <Icons.maximize size={17} />
        </button>
      </div>
    </div>
  );
}
