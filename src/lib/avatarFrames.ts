import type { CSSProperties } from 'react';

export type AvatarFrameSlug = 'princess_rose_01' | 'princess_rose_02' | 'princess_rose_03';

export type AvatarFrameTheme = {
  slug: AvatarFrameSlug;
  name: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  frameBackgroundSize?: string;
  frameBackgroundPosition?: string;
  price: number;
  priceType: 'stats' | 'fcoins';
};

export const AVATAR_FRAMES: Record<AvatarFrameSlug, AvatarFrameTheme> = {
  princess_rose_01: {
    slug: 'princess_rose_01',
    name: 'Marco Princesa Rosa I',
    description: 'Marco rosa ornamental para tu avatar.',
    imageUrl: '/avatar-frames/princess-rose-01/frame.svg',
    thumbnailUrl: '/avatar-frames/princess-rose-01/frame.svg',
    frameBackgroundSize: '76% auto',
    frameBackgroundPosition: 'center 45%',
    price: 2000,
    priceType: 'stats',
  },
  princess_rose_02: {
    slug: 'princess_rose_02',
    name: 'Marco Princesa Rosa II',
    description: 'Variante rosa brillante para destacar tu perfil.',
    imageUrl: '/avatar-frames/princess-rose-02/frame.svg',
    thumbnailUrl: '/avatar-frames/princess-rose-02/frame.svg',
    frameBackgroundSize: '76% auto',
    frameBackgroundPosition: 'center 45%',
    price: 2000,
    priceType: 'stats',
  },
  princess_rose_03: {
    slug: 'princess_rose_03',
    name: 'Marco Princesa Rosa III',
    description: 'Marco rosa elegante con presencia de tienda premium.',
    imageUrl: '/avatar-frames/princess-rose-03/frame.svg',
    thumbnailUrl: '/avatar-frames/princess-rose-03/frame.svg',
    frameBackgroundSize: '76% auto',
    frameBackgroundPosition: 'center 45%',
    price: 2000,
    priceType: 'stats',
  },
};

export const AVATAR_FRAME_SLUGS = Object.keys(AVATAR_FRAMES) as AvatarFrameSlug[];

export const getAvatarFrame = (slug?: string | null): AvatarFrameTheme | null => {
  if (!slug) return null;
  return (AVATAR_FRAMES as Record<string, AvatarFrameTheme>)[slug] || null;
};

export const isAvatarFrameSlug = (slug?: string | null) => Boolean(getAvatarFrame(slug));

export const getAvatarFrameStyle = (slug?: string | null) => {
  const frame = getAvatarFrame(slug);
  return frame
    ? ({
        '--avatar-frame-url': `url('${frame.imageUrl}')`,
        ...(frame.frameBackgroundSize ? { '--avatar-frame-background-size': frame.frameBackgroundSize } : {}),
        ...(frame.frameBackgroundPosition ? { '--avatar-frame-background-position': frame.frameBackgroundPosition } : {}),
      } as CSSProperties)
    : undefined;
};

export const AVATAR_FRAME_SHOP_ITEMS = AVATAR_FRAME_SLUGS.map((slug, index) => {
  const frame = AVATAR_FRAMES[slug];
  return {
    id: `local-${slug}`,
    slug: frame.slug,
    name: frame.name,
    description: frame.description,
    price: frame.price,
    price_type: frame.priceType,
    category: 'avatar_frame',
    tier_requirement: 'lite',
    image_url: frame.thumbnailUrl,
    is_active: true,
    tradeable: true,
    sort_order: 10_000 + index,
  };
});
