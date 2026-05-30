// 🎨 Sistema de Temas/Skins para Website y Launcher
// Cada skin cambia colores, gradientes, efectos en toda la interfaz

export type SkinType = 'launcher' | 'agario' | 'game';
export type SkinSlug = 'angelical' | 'demoniaco' | 'cyberpunk' | 'default';

export interface SkinTheme {
  name: string;
  slug: SkinSlug;
  type: SkinType;
  description: string;
  
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

// 🎀 SKIN ANGELICAL - Rosado, nubes, corazones, estilo Sanrio
export const ANGELICAL_SKIN: SkinTheme = {
  name: 'Angelical',
  slug: 'angelical',
  type: 'launcher',
  description: 'Estilo celestial rosado con nubes y corazones ✨',
  colors: {
    primary: '#ff69b4',      // Rosa hot
    secondary: '#ffc0cb',    // Rosa claro
    accent: '#ffb6d9',       // Rosa pastel
    background: '#fff5f9',   // Fondo blanco rosado
    card: '#ffe4f0',         // Card rosa muy claro
    text: '#6b3a6b',         // Texto morado oscuro
    textMuted: '#b88bb8',    // Texto morado claro
    border: '#ffb6d9',       // Borde rosa
  },
  gradients: {
    header: 'linear-gradient(135deg, #ff69b4 0%, #ffb6d9 100%)',
    card: 'linear-gradient(135deg, #ffe4f0 0%, #fff5f9 100%)',
    button: 'linear-gradient(135deg, #ff69b4 0%, #ff89cc 100%)',
    hover: 'linear-gradient(135deg, #ff89cc 0%, #ffc0cb 100%)',
  },
  effects: {
    glow: '0 0 20px rgba(255, 105, 180, 0.4)',
    shadow: '0 8px 24px rgba(255, 105, 180, 0.15)',
    buttonHover: 'box-shadow: 0 0 15px rgba(255, 105, 180, 0.6), 0 4px 12px rgba(255, 105, 180, 0.3)',
    borderRadius: '20px',
  },
  patterns: {
    background: 'radial-gradient(circle at 20% 30%, rgba(255, 200, 221, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 182, 217, 0.2) 0%, transparent 50%)',
    card: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 192, 203, 0.1) 10px, rgba(255, 192, 203, 0.1) 20px)',
  },
};

// 😈 SKIN DEMONIACO - Rojo intenso, negro profundo, efectos de fuego infernal con TEXTURAS VARIADAS ESTRATÉGICAS
export const DEMONIACO_SKIN: SkinTheme = {
  name: 'Demoniaco',
  slug: 'demoniaco',
  type: 'launcher',
  description: 'Estilo oscuro rojo demoníaco con efectos de fuego infernal 🔥',
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
    sidebar: "linear-gradient(rgba(4, 4, 4, 0.84), rgba(7, 6, 6, 0.94)), url('/skins/demoniaco/textures/sidebar.png') center top / cover, linear-gradient(180deg, #080707, #120605 52%, #050505)",
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




// 🤖 SKIN CIBERPUNK - Neón, cyan, magenta, líneas de código
export const CYBERPUNK_SKIN: SkinTheme = {
  name: 'Ciberpunk',
  slug: 'cyberpunk',
  type: 'launcher',
  description: 'Estilo futurista con neón cyan y magenta 🌐',
  colors: {
    primary: '#00ffff',      // Cyan neón
    secondary: '#ff00ff',    // Magenta neón
    accent: '#00ff88',       // Verde neón
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

// 🎨 SKIN POR DEFECTO
export const DEFAULT_SKIN: SkinTheme = {
  name: 'Original',
  slug: 'default',
  type: 'launcher',
  description: 'Diseño clásico de Forbiddens',
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

// 📦 Todos los temas disponibles
export const ALL_SKINS = {
  angelical: ANGELICAL_SKIN,
  demoniaco: DEMONIACO_SKIN,
  cyberpunk: CYBERPUNK_SKIN,
  default: DEFAULT_SKIN,
};

// Lista de slugs disponibles
export const SKIN_SLUGS = ['default', 'angelical', 'demoniaco', 'cyberpunk'] as const;

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

  return `--skin-slug: ${theme.slug}; --skin-primary: ${theme.colors.primary}; --skin-secondary: ${theme.colors.secondary}; --skin-accent: ${theme.colors.accent}; --skin-background: ${theme.colors.background}; --skin-card: ${theme.colors.card}; --skin-text: ${theme.colors.text}; --skin-text-muted: ${theme.colors.textMuted}; --skin-border: ${theme.colors.border}; --skin-gradient-header: ${theme.gradients.header}; --skin-gradient-card: ${theme.gradients.card}; --skin-gradient-button: ${theme.gradients.button}; --skin-gradient-hover: ${theme.gradients.hover}; --skin-glow: ${theme.effects.glow}; --skin-shadow: ${theme.effects.shadow}; --skin-button-hover: ${theme.effects.buttonHover}; --skin-border-radius: ${theme.effects.borderRadius}; --skin-pattern-bg: ${theme.patterns.background}; --skin-pattern-card: ${theme.patterns.card}; ${optionalPatterns}`;
};
