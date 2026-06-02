export type ProfileTransitionSlug = 'fuego_infernal' | 'varita_magica';

export type ProfileTransitionTheme = {
  slug: ProfileTransitionSlug;
  name: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  price: number;
  priceType: 'stats' | 'fcoins';
  durationMs?: number;
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
