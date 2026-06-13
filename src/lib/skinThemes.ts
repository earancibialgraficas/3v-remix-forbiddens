// ðŸŽ¨ Sistema de Temas/Skins para Website y Launcher
// Cada skin cambia colores, gradientes, efectos en toda la interfaz

export type SkinType = 'launcher' | 'agario' | 'game';
export type SkinSlug = 'angelical' | 'mi_melodia_rosa' | 'demoniaco' | 'mercenario_bocasas' | 'cyberpunk' | 'default';

export interface SkinTheme {
  name: string;
  slug: SkinSlug;
  type: SkinType;
  description: string;
  family?: 'demoniaco';
  
  // Colores principales
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
    textMuted: string;
    border: string;
  };
  
  // Gradientes
  gradients: {
    header: string;
    card: string;
    button: string;
    hover: string;
  };
  
  // Efectos especiales
  effects: {
    glow: string;
    shadow: string;
    buttonHover: string;
    borderRadius: string;
  };
  
  // Texturas/Patrones
  patterns: {
    background: string;
    card: string;
    topbar?: string;
    sidebar?: string;
    panel?: string;
    profileHeader?: string;
    profileSurface?: string;
    slot?: string;
    button?: string;
    trim?: string;
    emblem?: string;
    lava?: string;
  };
}

// ðŸŽ€ SKIN ANGELICAL - Rosado, nubes, corazones, estilo Sanrio
export const ANGELICAL_SKIN: SkinTheme = {
  name: 'Rosa Pastel',
  slug: 'angelical',
  type: 'launcher',
  description: 'Recolor rosa pastel para website y launcher, suave pero con contraste legible.',
  colors: {
    primary: '#d94f86',
    secondary: '#a93b6f',
    accent: '#f6a8c9',
    background: '#fff4f8',
    card: '#fff9fc',
    text: '#452437',
    textMuted: '#86596e',
    border: '#e9a5c4',
  },
  gradients: {
    header: 'linear-gradient(135deg, #fff8fb 0%, #ffdceb 42%, #f5a6c8 100%)',
    card: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 239, 247, 0.94) 100%)',
    button: 'linear-gradient(135deg, #d94f86 0%, #f08ab4 100%)',
    hover: 'linear-gradient(135deg, #c74278 0%, #ef7ead 100%)',
  },
  effects: {
    glow: 'rgba(217, 79, 134, 0.34)',
    shadow: '0 12px 30px rgba(169, 59, 111, 0.14), 0 3px 10px rgba(217, 79, 134, 0.1)',
    buttonHover: 'box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.58), 0 12px 24px rgba(217, 79, 134, 0.22)',
    borderRadius: '10px',
  },
  patterns: {
    background: 'radial-gradient(circle at 16% 18%, rgba(246, 168, 201, 0.36), transparent 18rem), radial-gradient(circle at 86% 12%, rgba(255, 220, 235, 0.7), transparent 20rem), radial-gradient(circle at 72% 88%, rgba(217, 79, 134, 0.12), transparent 19rem), linear-gradient(135deg, #fff9fc 0%, #fff1f7 48%, #ffe0ed 100%)',
    card: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 238, 247, 0.93)), radial-gradient(circle at 18% 14%, rgba(246, 168, 201, 0.2), transparent 12rem)',
    topbar: 'linear-gradient(90deg, rgba(255, 250, 253, 0.98), rgba(255, 221, 236, 0.96) 52%, rgba(255, 247, 251, 0.98))',
    sidebar: 'linear-gradient(180deg, rgba(255, 251, 253, 0.98), rgba(255, 232, 243, 0.96))',
    panel: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 238, 247, 0.94))',
    profileHeader: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 218, 234, 0.9))',
    profileSurface: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 239, 247, 0.94))',
    slot: 'radial-gradient(circle at 50% 20%, rgba(246, 168, 201, 0.24), transparent 54%), linear-gradient(135deg, #fffafd, #ffeaf3)',
    button: 'linear-gradient(135deg, #d94f86, #ef86b2)',
  },
};

export const MI_MELODIA_ROSA_SKIN: SkinTheme = {
  name: 'Mi Melodia Rosa',
  slug: 'mi_melodia_rosa',
  type: 'launcher',
  family: 'demoniaco',
  description: 'Skin rosa con texturas, marcos ornamentales y acabado pastel para website y launcher.',
  colors: {
    primary: '#d94f86',
    secondary: '#a93b6f',
    accent: '#f6a8c9',
    background: '#fff4f8',
    card: '#fff9fc',
    text: '#452437',
    textMuted: '#86596e',
    border: '#e9a5c4',
  },
  gradients: {
    header: 'linear-gradient(135deg, #fff8fb 0%, #ffdceb 42%, #f5a6c8 100%)',
    card: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 239, 247, 0.94) 100%)',
    button: 'linear-gradient(135deg, #d94f86 0%, #f08ab4 100%)',
    hover: 'linear-gradient(135deg, #c74278 0%, #ef7ead 100%)',
  },
  effects: {
    glow: 'rgba(217, 79, 134, 0.34)',
    shadow: '0 12px 30px rgba(169, 59, 111, 0.14), 0 3px 10px rgba(217, 79, 134, 0.1)',
    buttonHover: 'box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.58), 0 12px 24px rgba(217, 79, 134, 0.22)',
    borderRadius: '10px',
  },
  patterns: {
    background: "radial-gradient(circle at 16% 18%, rgba(255, 203, 229, 0.36), transparent 18rem), linear-gradient(rgba(255, 250, 253, 0.9), rgba(255, 238, 247, 0.92)), url('/skins/mi_melodia_rosa/backgrounds/solid/hellscape-castle.png') center top / cover fixed, linear-gradient(135deg, #fff9fc 0%, #ffe7f3 52%, #ffd1e7 100%)",
    card: "linear-gradient(rgba(255, 250, 253, 0.82), rgba(255, 240, 248, 0.9)), url('/skins/mi_melodia_rosa/backgrounds/solid/basalt-wide.png') center / cover, linear-gradient(135deg, rgba(255, 244, 250, 0.9), rgba(255, 221, 237, 0.88))",
    topbar: "linear-gradient(rgba(255, 250, 253, 0.86), rgba(255, 232, 243, 0.92)), url('/skins/mi_melodia_rosa/textures/AZ5xjYg286URBkpJZIxzeQ-AZ5xjcojgoGln-NTZLbqsw.png') center / 100% 100%, linear-gradient(90deg, #fffafd, #ffd9eb 50%, #fff8fc)",
    sidebar: "linear-gradient(rgba(255, 247, 251, 0.68), rgba(255, 228, 242, 0.8)), url('/skins/mi_melodia_rosa/backgrounds/solid/window-rock.png') center top / cover, linear-gradient(180deg, #fffafd, #ffe3f1)",
    panel: "linear-gradient(rgba(255, 250, 253, 0.72), rgba(255, 235, 246, 0.84)), url('/skins/mi_melodia_rosa/backgrounds/solid/window-rock.png') center / cover, linear-gradient(135deg, #fffafd, #ffe4f2)",
    profileHeader: "linear-gradient(90deg, rgba(255, 247, 251, 0.3), rgba(255, 213, 234, 0.2) 48%, rgba(255, 247, 251, 0.42)), url('/skins/mi_melodia_rosa/backgrounds/solid/profile-banner.png') center / cover",
    profileSurface: "linear-gradient(rgba(255, 250, 253, 0.58), rgba(255, 235, 246, 0.78)), url('/skins/mi_melodia_rosa/backgrounds/solid/window-rock.png') center / cover",
    slot: "linear-gradient(rgba(255, 250, 253, 0.74), rgba(255, 236, 246, 0.88)), url('/skins/mi_melodia_rosa/backgrounds/solid/basalt-tall.png') center / cover, radial-gradient(circle at 35% 25%, rgba(217, 91, 151, 0.18), transparent 55%)",
    button: "linear-gradient(180deg, rgba(217, 91, 151, 0.92), rgba(159, 71, 121, 0.94)), url('/skins/mi_melodia_rosa/textures/AZ5xhKFYYjz3ZvBBPIjodA-AZ5xhOV9VFJOGHu8DoACrg.png') center / 100% 100%",
    trim: "url('/skins/mi_melodia_rosa/textures/AZ5xfXwM5JCVm0yH6eZphA-AZ5xfb-SbaS3qDQBbY-Wcg.png') center / 100% 100%",
    emblem: "url('/skins/mi_melodia_rosa/decorations/demon-emblem.png')",
    lava: "url('/skins/mi_melodia_rosa/textures/lava-overlay.jpg')",
  },
};

// ðŸ˜ˆ SKIN DEMONIACO - Rojo intenso, negro profundo, efectos de fuego infernal con TEXTURAS VARIADAS ESTRATÃ‰GICAS
export const DEMONIACO_SKIN: SkinTheme = {
  name: 'Demoniaco',
  slug: 'demoniaco',
  type: 'launcher',
  family: 'demoniaco',
  description: 'Estilo oscuro rojo demonÃ­aco con efectos de fuego infernal ðŸ”¥',
  colors: {
    primary: '#d94a38',      // Rojo infernal sobrio
    secondary: '#b65a4b',    // Rojo cobre
    accent: '#e09a75',       // Contraste calido suave
    background: '#0a0a0a',   // Negro oscuro
    card: '#1a1a1a',         // Gris oscuro
    text: '#f0c1aa',         // Rojo claro legible
    textMuted: '#b98778',    // Rojo muted
    border: '#6b3333',       // Rojo muy oscuro
  },
  gradients: {
    header: 'linear-gradient(135deg, #d94a38 0%, #8f241d 50%, #43100e 100%)',
    card: 'linear-gradient(135deg, #1a1a1a 0%, #2a1515 50%, #0f0f0f 100%)',
    button: 'linear-gradient(135deg, #9b241b 0%, #c33b2c 50%, #e06a4f 100%)',
    hover: 'linear-gradient(135deg, #b83227 0%, #d95743 50%, #e89b78 100%)',
  },
  effects: {
    glow: '0 0 18px rgba(185, 44, 34, 0.48), 0 0 10px rgba(219, 88, 66, 0.26)',
    shadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px rgba(185, 44, 34, 0.14)',
    buttonHover: 'box-shadow: 0 0 18px rgba(185, 44, 34, 0.55), 0 0 10px rgba(219, 88, 66, 0.34), 0 4px 12px rgba(0, 0, 0, 0.8)',
    borderRadius: '4px',
  },
  patterns: {
    background: "radial-gradient(circle at 56% -12%, rgba(255, 38, 0, 0.18), transparent 24rem), linear-gradient(rgba(4, 4, 4, 0.9), rgba(5, 4, 4, 0.94)), url('/skins/demoniaco/backgrounds/solid/hellscape-castle.png') center top / cover fixed, linear-gradient(135deg, #070707 0%, #120605 48%, #050505 100%)",
    card: "linear-gradient(rgba(8, 8, 8, 0.88), rgba(6, 6, 6, 0.94)), url('/skins/demoniaco/backgrounds/solid/basalt-wide.png') center / cover, linear-gradient(135deg, rgba(24, 10, 8, 0.72), rgba(5, 5, 5, 0.98))",
    topbar: "linear-gradient(rgba(5, 5, 5, 0.9), rgba(8, 7, 7, 0.96)), url('/skins/demoniaco/textures/AZ5xjYg286URBkpJZIxzeQ-AZ5xjcojgoGln-NTZLbqsw.png') center / 100% 100%, linear-gradient(90deg, #050505, #150605 50%, #050505)",
    sidebar: "linear-gradient(rgba(4, 3, 3, 0.5), rgba(7, 5, 5, 0.74)), url('/skins/demoniaco/backgrounds/solid/window-rock.png') center top / cover, linear-gradient(180deg, #080707, #120605 52%, #050505)",
    panel: "linear-gradient(rgba(6, 4, 4, 0.48), rgba(5, 3, 3, 0.7)), url('/skins/demoniaco/backgrounds/solid/window-rock.png') center / cover, linear-gradient(135deg, #13100e, #060606)",
    profileHeader: "linear-gradient(90deg, rgba(3, 3, 3, 0.38), rgba(18, 4, 4, 0.22) 48%, rgba(3, 3, 3, 0.56)), url('/skins/demoniaco/backgrounds/solid/profile-banner.png') center / cover",
    profileSurface: "linear-gradient(rgba(5, 4, 4, 0.46), rgba(4, 3, 3, 0.68)), url('/skins/demoniaco/backgrounds/solid/window-rock.png') center / cover",
    slot: "linear-gradient(rgba(7, 7, 7, 0.86), rgba(5, 5, 5, 0.94)), url('/skins/demoniaco/backgrounds/solid/basalt-tall.png') center / cover, radial-gradient(circle at 35% 25%, rgba(255, 58, 0, 0.12), transparent 55%)",
    button: "linear-gradient(180deg, rgba(153, 22, 15, 0.96), rgba(69, 12, 9, 0.98)), url('/skins/demoniaco/textures/AZ5xhKFYYjz3ZvBBPIjodA-AZ5xhOV9VFJOGHu8DoACrg.png') center / 100% 100%",
    trim: "url('/skins/demoniaco/textures/AZ5xfXwM5JCVm0yH6eZphA-AZ5xfb-SbaS3qDQBbY-Wcg.png') center / 100% 100%",
    emblem: "url('/skins/demoniaco/decorations/demon-emblem.png')",
    lava: "url('/skins/demoniaco/textures/lava-overlay.jpg')",
  },

};




// ðŸ¤– SKIN CIBERPUNK - NeÃ³n, cyan, magenta, lÃ­neas de cÃ³digo
// Skin Mercenario Bocasas - variante tactica rojo/negro basada en la arquitectura demoniaca
export const MERCENARIO_BOCASAS_SKIN: SkinTheme = {
  name: 'Mercenario Bocasas',
  slug: 'mercenario_bocasas',
  type: 'launcher',
  family: 'demoniaco',
  description: 'Estilo mercenario rojo y negro con armas, acero oscuro y energia carmesi.',
  colors: {
    primary: '#e0473f',
    secondary: '#a63a35',
    accent: '#d8a08f',
    background: '#070707',
    card: '#151111',
    text: '#f2c8bd',
    textMuted: '#ae7d74',
    border: '#5e2926',
  },
  gradients: {
    header: 'linear-gradient(135deg, #e0473f 0%, #7e1d1a 50%, #171010 100%)',
    card: 'linear-gradient(135deg, #151111 0%, #24110f 50%, #070707 100%)',
    button: 'linear-gradient(135deg, #7c1714 0%, #b62822 54%, #e0574b 100%)',
    hover: 'linear-gradient(135deg, #9a211c 0%, #cf3e36 54%, #e88974 100%)',
  },
  effects: {
    glow: '0 0 18px rgba(207, 50, 42, 0.46), 0 0 10px rgba(224, 90, 72, 0.24)',
    shadow: '0 8px 24px rgba(0, 0, 0, 0.72), 0 0 15px rgba(207, 50, 42, 0.14)',
    buttonHover: 'box-shadow: 0 0 18px rgba(207, 50, 42, 0.52), 0 0 10px rgba(224, 90, 72, 0.32), 0 4px 12px rgba(0, 0, 0, 0.82)',
    borderRadius: '4px',
  },
  patterns: {
    background: "radial-gradient(circle at 56% -12%, rgba(224, 38, 32, 0.18), transparent 24rem), linear-gradient(rgba(4, 4, 4, 0.9), rgba(5, 4, 4, 0.94)), url('/skins/mercenario_bocasas/backgrounds/solid/hellscape-castle.png') center top / cover fixed, linear-gradient(135deg, #070707 0%, #120605 48%, #050505 100%)",
    card: "linear-gradient(rgba(8, 8, 8, 0.88), rgba(6, 6, 6, 0.94)), url('/skins/mercenario_bocasas/backgrounds/solid/basalt-wide.png') center / cover, linear-gradient(135deg, rgba(24, 10, 8, 0.72), rgba(5, 5, 5, 0.98))",
    topbar: "linear-gradient(rgba(5, 5, 5, 0.9), rgba(8, 7, 7, 0.96)), url('/skins/mercenario_bocasas/textures/AZ5xjYg286URBkpJZIxzeQ-AZ5xjcojgoGln-NTZLbqsw.png') center / 100% 100%, linear-gradient(90deg, #050505, #150605 50%, #050505)",
    sidebar: "linear-gradient(rgba(4, 3, 3, 0.5), rgba(7, 5, 5, 0.74)), url('/skins/mercenario_bocasas/backgrounds/solid/window-rock.png') center top / cover, linear-gradient(180deg, #080707, #120605 52%, #050505)",
    panel: "linear-gradient(rgba(6, 4, 4, 0.48), rgba(5, 3, 3, 0.7)), url('/skins/mercenario_bocasas/backgrounds/solid/window-rock.png') center / cover, linear-gradient(135deg, #13100e, #060606)",
    profileHeader: "linear-gradient(90deg, rgba(3, 3, 3, 0.38), rgba(18, 4, 4, 0.22) 48%, rgba(3, 3, 3, 0.56)), url('/skins/mercenario_bocasas/backgrounds/solid/profile-banner.png') center / cover",
    profileSurface: "linear-gradient(rgba(5, 4, 4, 0.46), rgba(4, 3, 3, 0.68)), url('/skins/mercenario_bocasas/backgrounds/solid/window-rock.png') center / cover",
    slot: "linear-gradient(rgba(7, 7, 7, 0.86), rgba(5, 5, 5, 0.94)), url('/skins/mercenario_bocasas/backgrounds/solid/basalt-tall.png') center / cover, radial-gradient(circle at 35% 25%, rgba(224, 44, 35, 0.12), transparent 55%)",
    button: "linear-gradient(180deg, rgba(150, 22, 18, 0.96), rgba(65, 12, 10, 0.98)), url('/skins/mercenario_bocasas/textures/AZ5xhKFYYjz3ZvBBPIjodA-AZ5xhOV9VFJOGHu8DoACrg.png') center / 100% 100%",
    trim: "url('/skins/mercenario_bocasas/textures/AZ5xfXwM5JCVm0yH6eZphA-AZ5xfb-SbaS3qDQBbY-Wcg.png') center / 100% 100%",
    emblem: "url('/skins/mercenario_bocasas/decorations/demon-emblem.png')",
    lava: "url('/skins/mercenario_bocasas/textures/lava-overlay.jpg')",
  },
};

export const CYBERPUNK_SKIN: SkinTheme = {
  name: 'Ciberpunk',
  slug: 'cyberpunk',
  type: 'launcher',
  description: 'Estilo futurista con neÃ³n cyan y magenta ðŸŒ',
  colors: {
    primary: '#00ffff',      // Cyan neÃ³n
    secondary: '#ff00ff',    // Magenta neÃ³n
    accent: '#00ff88',       // Verde neÃ³n
    background: '#0a0e27',   // Azul muy oscuro
    card: '#0f1a3a',         // Azul oscuro
    text: '#00ffff',         // Cyan claro
    textMuted: '#00aa88',    // Verde apagado
    border: '#00ffff',       // Borde cyan
  },
  gradients: {
    header: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
    card: 'linear-gradient(135deg, #0f1a3a 0%, #1a0f2e 100%)',
    button: 'linear-gradient(135deg, #00ffff 0%, #00ff88 100%)',
    hover: 'linear-gradient(135deg, #00ff88 0%, #ff00ff 100%)',
  },
  effects: {
    glow: '0 0 40px rgba(0, 255, 255, 0.8)',
    shadow: '0 8px 24px rgba(0, 255, 255, 0.2), 0 0 20px rgba(255, 0, 255, 0.1)',
    buttonHover: 'box-shadow: 0 0 30px rgba(0, 255, 255, 1), 0 0 20px rgba(255, 0, 255, 0.6)',
    borderRadius: '2px',
  },
  patterns: {
    background: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.05) 25%, rgba(0, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.05) 75%, rgba(0, 255, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(0deg, transparent 24%, rgba(255, 0, 255, 0.02) 25%, rgba(255, 0, 255, 0.02) 26%, transparent 27%, transparent 74%, rgba(255, 0, 255, 0.02) 75%, rgba(255, 0, 255, 0.02) 76%, transparent 77%, transparent)',
    card: 'repeating-linear-gradient(90deg, rgba(0, 255, 255, 0.1) 0px, rgba(0, 255, 255, 0.1) 1px, transparent 1px, transparent 2px)',
  },
};

// ðŸŽ¨ SKIN POR DEFECTO
export const DEFAULT_SKIN: SkinTheme = {
  name: 'Original',
  slug: 'default',
  type: 'launcher',
  description: 'DiseÃ±o clÃ¡sico de Forbiddens',
  colors: {
    primary: '#de1839',
    secondary: '#00ffff',
    accent: '#00ff88',
    background: '#0a0a0a',
    card: '#1a1a1a',
    text: '#ffffff',
    textMuted: '#888888',
    border: '#de1839',
  },
  gradients: {
    header: 'linear-gradient(135deg, #de1839 0%, #8b0000 100%)',
    card: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
    button: 'linear-gradient(135deg, #de1839 0%, #00ffff 100%)',
    hover: 'linear-gradient(135deg, #00ffff 0%, #00ff88 100%)',
  },
  effects: {
    glow: '0 0 20px rgba(222, 24, 57, 0.4)',
    shadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    buttonHover: 'box-shadow: 0 0 15px rgba(222, 24, 57, 0.6)',
    borderRadius: '8px',
  },
  patterns: {
    background: 'none',
    card: 'none',
  },
};

// ðŸ“¦ Todos los temas disponibles
export const ALL_SKINS = {
  angelical: ANGELICAL_SKIN,
  mi_melodia_rosa: MI_MELODIA_ROSA_SKIN,
  demoniaco: DEMONIACO_SKIN,
  mercenario_bocasas: MERCENARIO_BOCASAS_SKIN,
  cyberpunk: CYBERPUNK_SKIN,
  default: DEFAULT_SKIN,
};

// Lista de slugs disponibles
export const SKIN_SLUGS = ['default', 'angelical', 'mi_melodia_rosa', 'demoniaco', 'mercenario_bocasas', 'cyberpunk'] as const;

export const SKIN_ASSET_BASE_BY_SLUG: Partial<Record<SkinSlug, string>> = {
  angelical: '/skins/angelical',
  mi_melodia_rosa: '/skins/mi_melodia_rosa',
  demoniaco: '/skins/demoniaco',
  mercenario_bocasas: '/skins/mercenario_bocasas',
};

export const SKIN_AVATAR_FRAME_CLASS_BY_SLUG: Partial<Record<SkinSlug, string>> = {
  mi_melodia_rosa: 'avatar-frame-mi-melodia-rosa',
  demoniaco: 'avatar-frame-demoniaco',
  mercenario_bocasas: 'avatar-frame-mercenario-bocasas',
};

export const getSkinThumbnailUrl = (slug?: string | null) => {
  if (slug === 'angelical') return '/skins/angelical/store/thumbnail.svg';
  const base = (SKIN_ASSET_BASE_BY_SLUG as Record<string, string | undefined>)[slug || ''];
  return base ? `${base}/store/thumbnail.png` : null;
};

export const getLauncherSkinAvatarFrameClass = (slug?: string | null) =>
  (SKIN_AVATAR_FRAME_CLASS_BY_SLUG as Record<string, string | undefined>)[slug || ''] || null;

// Obtener un tema por slug
export const getSkinTheme = (slug?: string): SkinTheme => {
  if (!slug || slug === 'default') return DEFAULT_SKIN;
  return (ALL_SKINS as any)[slug] || DEFAULT_SKIN;
};

// Generar CSS variables para un tema
export const generateThemeCSS = (theme: SkinTheme): string => {
  const optionalPatterns = [
    ['--skin-pattern-topbar', theme.patterns.topbar],
    ['--skin-pattern-sidebar', theme.patterns.sidebar],
    ['--skin-pattern-panel', theme.patterns.panel],
    ['--skin-pattern-profile-header', theme.patterns.profileHeader],
    ['--skin-pattern-profile-surface', theme.patterns.profileSurface],
    ['--skin-pattern-slot', theme.patterns.slot],
    ['--skin-pattern-button', theme.patterns.button],
    ['--skin-pattern-trim', theme.patterns.trim],
    ['--skin-pattern-emblem', theme.patterns.emblem],
    ['--skin-pattern-lava', theme.patterns.lava],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');

  return `--skin-slug: ${theme.slug}; --skin-family: ${theme.family || theme.slug}; --skin-primary: ${theme.colors.primary}; --skin-secondary: ${theme.colors.secondary}; --skin-accent: ${theme.colors.accent}; --skin-background: ${theme.colors.background}; --skin-card: ${theme.colors.card}; --skin-text: ${theme.colors.text}; --skin-text-muted: ${theme.colors.textMuted}; --skin-border: ${theme.colors.border}; --skin-gradient-header: ${theme.gradients.header}; --skin-gradient-card: ${theme.gradients.card}; --skin-gradient-button: ${theme.gradients.button}; --skin-gradient-hover: ${theme.gradients.hover}; --skin-glow: ${theme.effects.glow}; --skin-shadow: ${theme.effects.shadow}; --skin-button-hover: ${theme.effects.buttonHover}; --skin-border-radius: ${theme.effects.borderRadius}; --skin-pattern-bg: ${theme.patterns.background}; --skin-pattern-card: ${theme.patterns.card}; ${optionalPatterns}`;
};
