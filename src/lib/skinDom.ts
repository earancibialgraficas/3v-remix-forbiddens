import { generateThemeCSS, SkinTheme } from '@/lib/skinThemes';

type SkinSource = {
  theme: SkinTheme | null;
  priority: number;
  updatedAt: number;
};

const SKIN_VAR_PATTERN = /--skin-[^:]+:[^;]+;?/g;
const skinSources = new Map<string, SkinSource>();

const DEMONIACO_PRELOAD_ASSETS = [
  '/skins/demoniaco/backgrounds/solid/hellscape-castle.png',
  '/skins/demoniaco/backgrounds/solid/window-rock.png',
  '/skins/demoniaco/backgrounds/solid/profile-banner.png',
  '/skins/demoniaco/backgrounds/solid/basalt-wide.png',
  '/skins/demoniaco/backgrounds/solid/basalt-tall.png',
  '/skins/demoniaco/frames/avatar-ring-trim.png',
  '/skins/demoniaco/frames/frame-edge-v2-trim.png',
  '/skins/demoniaco/frames/frame-edge-v2-trim-vertical.png',
  '/skins/demoniaco/frames/barra-launcher.svg?v=20260601b',
  '/skins/demoniaco/frames/marco-arriba-izquierda.svg',
  '/skins/demoniaco/frames/marco-arriba-derecha.svg',
  '/skins/demoniaco/frames/marco-abajo-derecha.svg',
  '/skins/demoniaco/frames/marco-abajo-izquierda.svg',
  '/skins/demoniaco/frames/separador-en-forma-de-T.svg',
  '/skins/demoniaco/frames/separador-en-forma-de-T-invertido.svg',
  '/skins/demoniaco/equipment/equipment-star.png',
  '/skins/demoniaco/slots/slot-hover.png',
  '/skins/demoniaco/home/banner-hero.png',
  '/skins/demoniaco/textures/AZ5xfXwM5JCVm0yH6eZphA-AZ5xfb-SbaS3qDQBbY-Wcg.png',
  '/skins/demoniaco/textures/AZ5xhKFYYjz3ZvBBPIjodA-AZ5xhOV9VFJOGHu8DoACrg.png',
  '/skins/demoniaco/textures/AZ5xjYg286URBkpJZIxzeQ-AZ5xjcojgoGln-NTZLbqsw.png',
  '/skins/demoniaco/textures/lava-overlay.jpg',
];

const preloadSkinAssets = (slug?: string) => {
  if (typeof window === 'undefined' || slug !== 'demoniaco') return;
  DEMONIACO_PRELOAD_ASSETS.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });
};

const cleanSkinVariables = (style: string) => style.replace(SKIN_VAR_PATTERN, '').trim();

const applyThemeToRoot = (theme: SkinTheme | null) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const currentStyle = root.getAttribute('style') || '';
  const cleanedStyle = cleanSkinVariables(currentStyle);

  if (!theme || theme.slug === 'default') {
    if (cleanedStyle) {
      root.setAttribute('style', cleanedStyle);
    } else {
      root.removeAttribute('style');
    }
    root.removeAttribute('data-skin-slug');
    return;
  }

  preloadSkinAssets(theme.slug);
  const cssVariables = generateThemeCSS(theme);
  root.setAttribute('style', `${cssVariables}${cleanedStyle ? ' ' + cleanedStyle : ''}`);
  root.setAttribute('data-skin-slug', theme.slug);
};

const getWinningSource = () => {
  let winning: SkinSource | null = null;
  skinSources.forEach((source) => {
    if (!source.theme || source.theme.slug === 'default') return;
    if (!winning) {
      winning = source;
      return;
    }
    if (source.priority > winning.priority) {
      winning = source;
      return;
    }
    if (source.priority === winning.priority && source.updatedAt > winning.updatedAt) {
      winning = source;
    }
  });
  return winning;
};

const refreshRootSkin = () => {
  applyThemeToRoot(getWinningSource()?.theme ?? null);
};

export const setSkinThemeSource = (id: string, theme: SkinTheme | null, priority = 0) => {
  skinSources.set(id, {
    theme,
    priority,
    updatedAt: Date.now(),
  });
  refreshRootSkin();
};

export const clearSkinThemeSource = (id: string) => {
  skinSources.delete(id);
  refreshRootSkin();
};
