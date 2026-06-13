export type EmulatorShellSlug = 'rosita_nes' | 'snes_retro';

export type EmulatorShellTheme = {
  slug: EmulatorShellSlug;
  name: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  priceType: 'stats' | 'fcoins';
  tierRequirement: 'novato' | 'lite' | 'legacy' | 'creator' | 'staff';
  compatibleConsoles: string[];
  assets: {
    buttonsBaseUrl: string;
    decorations: string;
  };
};

export const EMULATOR_SHELLS: Record<EmulatorShellSlug, EmulatorShellTheme> = {
  rosita_nes: {
    slug: 'rosita_nes',
    name: 'Consola Rosita NES',
    description: 'Interfaz web rosada para juegos NES. Esta base queda lista para ampliar compatibilidad a mas consolas web.',
    thumbnailUrl: '/shop-thumbnails/rosita-nes.png',
    price: 10000,
    priceType: 'fcoins',
    tierRequirement: 'lite',
    compatibleConsoles: ['nes'],
    assets: {
      buttonsBaseUrl: '/emulator-shells/rosita-nes/buttons',
      decorations: '/emulator-shells/rosita-nes/buttons/decoraciones.svg',
    },
  },
  snes_retro: {
    slug: 'snes_retro',
    name: 'Consola Retro SNES',
    description: 'Interfaz vertical para juegos SNES en celular y tablet.',
    thumbnailUrl: '/shop-thumbnails/snes-retro.png',
    price: 10000,
    priceType: 'fcoins',
    tierRequirement: 'lite',
    compatibleConsoles: ['snes'],
    assets: {
      buttonsBaseUrl: '/emulator-shells/snes-retro',
      decorations: '/emulator-shells/snes-retro/vertical-celular.svg',
    },
  },
};

export const EMULATOR_SHELL_SLUGS = Object.keys(EMULATOR_SHELLS) as EmulatorShellSlug[];

export const getEmulatorShell = (slug?: string | null): EmulatorShellTheme | null => {
  if (!slug) return null;
  return (EMULATOR_SHELLS as Record<string, EmulatorShellTheme>)[slug] || null;
};

export const isEmulatorShellSlug = (slug?: string | null) => Boolean(getEmulatorShell(slug));

export const isEmulatorShellCompatible = (slug: string | null | undefined, consoleName: string | null | undefined) => {
  const shell = getEmulatorShell(slug);
  if (!shell || !consoleName) return false;
  return shell.compatibleConsoles.includes(consoleName.toLowerCase());
};

export const EMULATOR_SHELL_SHOP_ITEMS = EMULATOR_SHELL_SLUGS.map((slug, index) => {
  const shell = EMULATOR_SHELLS[slug];
  return {
    id: `local-${slug}`,
    slug: shell.slug,
    name: shell.name,
    description: shell.description,
    price: shell.price,
    price_type: shell.priceType,
    category: 'emulator_shell',
    tier_requirement: shell.tierRequirement,
    image_url: shell.thumbnailUrl,
    is_active: true,
    tradeable: true,
    sort_order: 10_200 + index,
  };
});
