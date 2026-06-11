export type ProfileTransitionSlug = 'fuego_infernal' | 'varita_magica' | 'boomshacka' | 'boomshacka_v2';

export type ProfileTransitionTheme = {
  slug: ProfileTransitionSlug;
  name: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  price: number;
  priceType: 'stats' | 'fcoins';
  durationMs?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  blackTransparentWindowsMs?: Array<[number, number]>;
};

export const PROFILE_TRANSITIONS: Record<ProfileTransitionSlug, ProfileTransitionTheme> = {
  fuego_infernal: {
    slug: 'fuego_infernal',
    name: 'Transicion Fuego Infernal',
    description: 'Intro de fuego con sonido para presentar tu perfil.',
    videoUrl: '/cosmetics/transitions/fuego/fuego-infernal.mp4',
    thumbnailUrl: '/cosmetics/transitions/fuego/fuego-infernal.mp4',
    price: 5000,
    priceType: 'fcoins',
    durationMs: 2400,
  },
  varita_magica: {
    slug: 'varita_magica',
    name: 'Transicion Varita Magica',
    description: 'Intro magica con sonido para presentar tu perfil.',
    videoUrl: '/cosmetics/transitions/varita-magica/varita-magica.mp4',
    thumbnailUrl: '/cosmetics/transitions/varita-magica/varita-magica.mp4',
    price: 5000,
    priceType: 'fcoins',
    durationMs: 7000,
  },
  boomshacka: {
    slug: 'boomshacka',
    name: 'Transicion BOOMSHACKA',
    description: 'Intro explosiva con sonido para presentar tu perfil.',
    videoUrl: '/cosmetics/transitions/boomshacka/boomshacka.mp4',
    thumbnailUrl: '/cosmetics/transitions/boomshacka/boomshacka.mp4',
    price: 5000,
    priceType: 'fcoins',
    durationMs: 6000,
    fadeInMs: 500,
    fadeOutMs: 650,
    blackTransparentWindowsMs: [
      [0, 2000],
      [4000, 6000],
    ],
  },
  boomshacka_v2: {
    slug: 'boomshacka_v2',
    name: 'Transicion BOOMSHACKA v2',
    description: 'Intro explosiva version 2 con sonido para presentar tu perfil.',
    videoUrl: '/cosmetics/transitions/boomshacka-v2/boomshacka-v2.mp4',
    thumbnailUrl: '/cosmetics/transitions/boomshacka-v2/boomshacka-v2.mp4',
    price: 5000,
    priceType: 'fcoins',
    durationMs: 6000,
    fadeInMs: 500,
    fadeOutMs: 650,
    blackTransparentWindowsMs: [
      [0, 2000],
      [4000, 6000],
    ],
  },
};

export const PROFILE_TRANSITION_SLUGS = Object.keys(PROFILE_TRANSITIONS) as ProfileTransitionSlug[];

export const getProfileTransition = (slug?: string | null): ProfileTransitionTheme | null => {
  if (!slug) return null;
  return (PROFILE_TRANSITIONS as Record<string, ProfileTransitionTheme>)[slug] || null;
};

export const isProfileTransitionSlug = (slug?: string | null) => Boolean(getProfileTransition(slug));

export const PROFILE_TRANSITION_SHOP_ITEMS = PROFILE_TRANSITION_SLUGS.map((slug, index) => {
  const transition = PROFILE_TRANSITIONS[slug];
  return {
    id: `local-${slug}`,
    slug: transition.slug,
    name: transition.name,
    description: transition.description,
    price: transition.price,
    price_type: transition.priceType,
    category: 'cosmetic',
    tier_requirement: 'novato',
    image_url: transition.thumbnailUrl,
    is_active: true,
    tradeable: true,
    sort_order: 10_100 + index,
  };
});
