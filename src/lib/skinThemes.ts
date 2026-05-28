// 🎨 Sistema de Temas/Skins para Website y Launcher
// Cada skin cambia colores, gradientes, efectos en toda la interfaz

export type SkinType = 'launcher' | 'agario' | 'game';
export type SkinSlug = 'angelical' | 'satanic' | 'cyberpunk' | 'default';

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

// 😈 SKIN SATÁNICO - Rojo, negro, lava, pentagramas
export const SATANIC_SKIN: SkinTheme = {
  name: 'Satánico',
  slug: 'satanic',
  type: 'launcher',
  description: 'Estilo oscuro rojo con efectos de lava y pentagramas 🔥',
  colors: {
    primary: '#dc143c',      // Rojo crimson
    secondary: '#8b0000',    // Rojo oscuro
    accent: '#ff4500',       // Rojo-naranja
    background: '#1a0a0a',   // Fondo casi negro
    card: '#2a1a1a',         // Card marrón oscuro
    text: '#ff6b6b',         // Texto rojo claro
    textMuted: '#8b5a5a',    // Texto marrón
    border: '#dc143c',       // Borde rojo
  },
  gradients: {
    header: 'linear-gradient(135deg, #dc143c 0%, #8b0000 100%)',
    card: 'linear-gradient(135deg, #2a1a1a 0%, #1f1515 100%)',
    button: 'linear-gradient(135deg, #dc143c 0%, #ff4500 100%)',
    hover: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
  },
  effects: {
    glow: '0 0 30px rgba(220, 20, 60, 0.6)',
    shadow: '0 12px 32px rgba(0, 0, 0, 0.8)',
    buttonHover: 'box-shadow: 0 0 25px rgba(220, 20, 60, 0.8), 0 0 15px rgba(255, 69, 0, 0.6)',
    borderRadius: '8px',
  },
  patterns: {
    background: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(220, 20, 60, 0.05) 40px, rgba(220, 20, 60, 0.05) 80px), repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(139, 0, 0, 0.05) 40px, rgba(139, 0, 0, 0.05) 80px)',
    card: 'radial-gradient(circle at 30% 30%, rgba(255, 69, 0, 0.1) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(220, 20, 60, 0.05) 0%, transparent 60%)',
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
  satanic: SATANIC_SKIN,
  cyberpunk: CYBERPUNK_SKIN,
  default: DEFAULT_SKIN,
};

// Obtener un tema por slug
export const getSkinTheme = (slug?: string): SkinTheme => {
  if (!slug || slug === 'default') return DEFAULT_SKIN;
  return (ALL_SKINS as any)[slug] || DEFAULT_SKIN;
};

// Generar CSS variables para un tema
export const generateThemeCSS = (theme: SkinTheme): string => {
  return `
    --skin-primary: ${theme.colors.primary};
    --skin-secondary: ${theme.colors.secondary};
    --skin-accent: ${theme.colors.accent};
    --skin-background: ${theme.colors.background};
    --skin-card: ${theme.colors.card};
    --skin-text: ${theme.colors.text};
    --skin-text-muted: ${theme.colors.textMuted};
    --skin-border: ${theme.colors.border};
    --skin-gradient-header: ${theme.gradients.header};
    --skin-gradient-card: ${theme.gradients.card};
    --skin-gradient-button: ${theme.gradients.button};
    --skin-gradient-hover: ${theme.gradients.hover};
    --skin-glow: ${theme.effects.glow};
    --skin-shadow: ${theme.effects.shadow};
    --skin-button-hover: ${theme.effects.buttonHover};
    --skin-border-radius: ${theme.effects.borderRadius};
    --skin-pattern-bg: ${theme.patterns.background};
    --skin-pattern-card: ${theme.patterns.card};
  `;
};
