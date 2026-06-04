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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(Boolean(transition));
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    doneRef.current = false;
    setLeaving(false);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setVisible(Boolean(transition));
  }, [transition?.slug, playKey]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !transition || !visible) return;

    const stopRender = () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = Math.max(1, Math.floor(window.innerWidth * dpr));
      const height = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const shouldApplyBlackTransparency = (currentTimeMs: number) => {
      if (!transition.blackTransparentWindowsMs?.length) return true;
      return transition.blackTransparentWindowsMs.some(([start, end]) => currentTimeMs >= start && currentTimeMs <= end);
    };

    const getFadeOpacity = (currentTimeMs: number) => {
      const durationMs = transition.durationMs || Math.max(0, (video.duration || 0) * 1000);
      let opacity = 0.95;

      if (transition.fadeInMs && transition.fadeInMs > 0) {
        opacity *= Math.min(1, Math.max(0, currentTimeMs / transition.fadeInMs));
      }

      if (transition.fadeOutMs && transition.fadeOutMs > 0 && durationMs > 0) {
        const remainingMs = durationMs - currentTimeMs;
        opacity *= Math.min(1, Math.max(0, remainingMs / transition.fadeOutMs));
      }

      return opacity;
    };

    const renderFrame = () => {
      if (!canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        frameRef.current = window.requestAnimationFrame(renderFrame);
        return;
      }

      resizeCanvas();
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
      const dw = video.videoWidth * scale;
      const dh = video.videoHeight * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(video, dx, dy, dw, dh);
      canvas.style.opacity = String(getFadeOpacity(video.currentTime * 1000));

      if (shouldApplyBlackTransparency(video.currentTime * 1000)) {
        const frame = ctx.getImageData(0, 0, cw, ch);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          if (max < 42 || luma < 34) {
            data[i + 3] = 0;
          } else if (luma < 120) {
            data[i + 3] = Math.round(((luma - 34) / 86) * 210);
          } else {
            data[i + 3] = Math.min(255, Math.round(data[i + 3] * 1.08));
          }
        }
        ctx.putImageData(frame, 0, 0);
      }

      frameRef.current = window.requestAnimationFrame(renderFrame);
    };

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      stopRender();
      setLeaving(true);
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        setLeaving(false);
        onDone?.();
      }, 220);
    };

    const play = async () => {
      try {
        video.currentTime = 0;
        video.muted = false;
        await video.play();
        renderFrame();
      } catch {
        try {
          video.muted = true;
          video.currentTime = 0;
          await video.play();
          renderFrame();
        } catch {
          finish();
        }
      }
    };

    const timeout = window.setTimeout(finish, Math.max(1200, transition.durationMs || 2400));
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    void play();

    return () => {
      window.clearTimeout(timeout);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      stopRender();
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
    };
  }, [transition, visible, playKey, onDone]);

  if (!transition || !visible || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'profile-transition-overlay pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-transparent transition-opacity duration-200',
        leaving ? 'opacity-0' : 'opacity-100',
        className,
      )}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src={transition.videoUrl}
        playsInline
        preload="auto"
        className="absolute h-px w-px opacity-0"
      />
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-95 [filter:brightness(1.08)_contrast(1.1)_saturate(1.12)]"
      />
    </div>,
    document.body,
  );
}
