import { useEffect, useState } from 'react';
import ProfileTransitionOverlay from '@/components/ProfileTransitionOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileTransition } from '@/hooks/useUserProfileTransition';

const LOGIN_TRANSITION_FLAG = 'forbiddens:play-login-transition';

export const requestLoginTransition = () => {
  try {
    sessionStorage.setItem(LOGIN_TRANSITION_FLAG, '1');
  } catch {}
};

export default function GlobalProfileTransitionPlayer() {
  const { user } = useAuth();
  const { profileTransition } = useUserProfileTransition(user?.id);
  const [queuedSlug, setQueuedSlug] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);

  const play = (slug?: string | null) => {
    if (!slug) return;
    setQueuedSlug(slug);
    setPlayKey((key) => key + 1);
  };

  useEffect(() => {
    const handlePreview = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string | null }>).detail;
      play(detail?.slug);
    };

    window.addEventListener('forbiddens:play-profile-transition', handlePreview);
    return () => window.removeEventListener('forbiddens:play-profile-transition', handlePreview);
  }, []);

  useEffect(() => {
    if (!user?.id || !profileTransition?.slug) return;
    let shouldPlay = false;
    try {
      shouldPlay = sessionStorage.getItem(LOGIN_TRANSITION_FLAG) === '1';
      if (shouldPlay) sessionStorage.removeItem(LOGIN_TRANSITION_FLAG);
    } catch {}
    if (shouldPlay) play(profileTransition.slug);
  }, [user?.id, profileTransition?.slug]);

  return (
    <ProfileTransitionOverlay
      slug={queuedSlug}
      playKey={playKey}
      onDone={() => setQueuedSlug(null)}
    />
  );
}
