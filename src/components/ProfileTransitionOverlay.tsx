import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getProfileTransition } from '@/lib/profileTransitions';
import { cn } from '@/lib/utils';

type ProfileTransitionOverlayProps = {
  slug?: string | null;
  playKey?: string | number;
  onDone?: () => void;
  className?: string;
};

export default function ProfileTransitionOverlay({ slug, playKey, onDone, className }: ProfileTransitionOverlayProps) {
  const transition = getProfileTransition(slug);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(Boolean(transition));
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setVisible(Boolean(transition));
  }, [transition?.slug, playKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !transition || !visible) return;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setVisible(false);
      onDone?.();
    };

    const play = async () => {
      try {
        video.currentTime = 0;
        video.muted = false;
        await video.play();
      } catch {
        try {
          video.muted = true;
          video.currentTime = 0;
          await video.play();
        } catch {
          finish();
        }
      }
    };

    const timeout = window.setTimeout(finish, 2400);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    void play();

    return () => {
      window.clearTimeout(timeout);
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
    };
  }, [transition, visible, playKey, onDone]);

  if (!transition || !visible || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/15',
        className,
      )}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src={transition.videoUrl}
        playsInline
        preload="auto"
        className="h-full w-full object-cover opacity-95 mix-blend-screen [filter:contrast(1.08)_saturate(1.08)]"
      />
    </div>,
    document.body,
  );
}
