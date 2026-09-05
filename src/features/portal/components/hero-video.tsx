'use client';

import { Icons } from '@/components/icons';
import { useRef, useState } from 'react';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      setPlaying(true);
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
      <video
        ref={videoRef}
        className='h-full w-full object-cover'
        autoPlay
        muted
        loop
        playsInline
        preload='metadata'
        poster='/portal/hero-keyframe.jpg'
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src='/portal/hero-pv.mp4' type='video/mp4' />
      </video>
      <div className='portal-video-shade absolute inset-0' />
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
