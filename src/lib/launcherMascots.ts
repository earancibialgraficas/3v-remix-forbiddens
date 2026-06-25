export type LauncherMascotSlug = 'dragon_noxito' | 'avocado_palta';

export type LauncherMascotTheme = {
  slug: LauncherMascotSlug;
  name: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  priceType: 'stats' | 'fcoins';
  tierRequirement: 'novato' | 'lite' | 'legacy' | 'creator' | 'staff';
  companionOnly: boolean;
  assets: {
    baseUrl: string;
    config: string;
    modelUrl?: string;
  };
};

export const LAUNCHER_MASCOTS: Record<LauncherMascotSlug, LauncherMascotTheme> = {
  dragon_noxito: {
    slug: 'dragon_noxito',
    name: 'Mascota Dragon Noxito',
    description: 'Companero animado para el launcher nativo con burbuja de texto, sonido estilo juego cozy y reacciones al jugar.',
    thumbnailUrl: '/mascot/dragon/base.png',
    price: 10000,
    priceType: 'fcoins',
    tierRequirement: 'lite',
    companionOnly: true,
    assets: {
      baseUrl: '/mascot/dragon',
      config: 'dragonMascotConfig',
    },
  },
  avocado_palta: {
    slug: 'avocado_palta',
    name: 'Mascota Palta 3D',
    description: 'Mascota 3D riggeada para el launcher nativo, con animaciones de idle, caminar, hablar, dormir y reacciones al companion.',
    thumbnailUrl: '/mascot/avocado/base.png',
    price: 12000,
    priceType: 'fcoins',
    tierRequirement: 'lite',
    companionOnly: true,
    assets: {
      baseUrl: '/mascot/avocado',
      config: 'avocadoMascot3D',
      modelUrl: '/mascot/avocado/avocado_mascot.glb',
    },
  },
};

export const LAUNCHER_MASCOT_SLUGS = Object.keys(LAUNCHER_MASCOTS) as LauncherMascotSlug[];

export const getLauncherMascot = (slug?: string | null): LauncherMascotTheme | null => {
  if (!slug) return null;
  return (LAUNCHER_MASCOTS as Record<string, LauncherMascotTheme>)[slug] || null;
};

export const isLauncherMascotSlug = (slug?: string | null) => Boolean(getLauncherMascot(slug));

export const LAUNCHER_MASCOT_SHOP_ITEMS = LAUNCHER_MASCOT_SLUGS.map((slug, index) => {
  const mascot = LAUNCHER_MASCOTS[slug];
  return {
    id: `local-${slug}`,
    slug: mascot.slug,
    name: mascot.name,
    description: mascot.description,
    price: mascot.price,
    price_type: mascot.priceType,
    category: 'launcher_mascot',
    tier_requirement: mascot.tierRequirement,
    image_url: mascot.thumbnailUrl,
    is_active: true,
    tradeable: true,
    sort_order: 10_500 + index,
  };
});
