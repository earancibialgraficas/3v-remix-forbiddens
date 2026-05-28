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

// 😈 SKIN DEMONIACO - Rojo intenso, negro profundo, efectos de fuego
export const DEMONIACO_SKIN: SkinTheme = {
  name: 'Demoniaco',
  slug: 'demoniaco',
  type: 'launcher',
  description: 'Estilo oscuro rojo demoníaco con efectos de fuego infernal 🔥',
  colors: {
    primary: '#ff1111',      // Rojo puro intenso
    secondary: '#ff4444',    // Rojo claro
    accent: '#ff6600',       // Naranja fuego
    background: '#1a0606',   // Rojo muy oscuro (NO negro puro, evita pantallazo si fallan assets)
    card: '#2a0a0a',         // Rojo oscuro con algo de luz
    text: '#ff3333',         // Rojo brillante
    textMuted: '#aa3333',    // Rojo apagado
    border: '#ff1111',       // Borde rojo intenso
  },
  gradients: {
    header: 'linear-gradient(135deg, #ff1111 0%, #cc0000 50%, #660000 100%)',
    card: 'linear-gradient(135deg, #1a0606 0%, #330808 50%, #0a0202 100%)',
    button: 'linear-gradient(135deg, #ff1111 0%, #ff6600 50%, #ff3333 100%)',
    hover: 'linear-gradient(135deg, #ff3333 0%, #ff6600 50%, #ffaa00 100%)',
  },
  effects: {
    glow: '0 0 50px rgba(255, 17, 17, 1), 0 0 25px rgba(255, 102, 0, 0.6)',
    shadow: '0 16px 50px rgba(0, 0, 0, 0.95), 0 0 40px rgba(255, 17, 17, 0.4)',
    buttonHover: 'box-shadow: 0 0 40px rgba(255, 17, 17, 1), 0 0 25px rgba(255, 102, 0, 0.8), 0 6px 20px rgba(0, 0, 0, 0.9)',
    borderRadius: '6px',
  },
  patterns: {
    // Local fallback (siempre disponible) + CDN externo opcional. Si el CDN no responde,
    // el gradiente radial garantiza que NO se vea pantallazo negro.
    background: "url('/skins/demoniaco/backgrounds/main-bg.jpg'), radial-gradient(circle at 50% 30%, rgba(255, 102, 0, 0.35), rgba(26, 6, 6, 1) 70%)",
    card: "url('/skins/demoniaco/textures/lava-overlay.jpg'), linear-gradient(135deg, rgba(42, 10, 10, 0.95) 0%, rgba(26, 6, 6, 0.95) 100%)",
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
  return `--skin-primary: ${theme.colors.primary}; --skin-secondary: ${theme.colors.secondary}; --skin-accent: ${theme.colors.accent}; --skin-background: ${theme.colors.background}; --skin-card: ${theme.colors.card}; --skin-text: ${theme.colors.text}; --skin-text-muted: ${theme.colors.textMuted}; --skin-border: ${theme.colors.border}; --skin-gradient-header: ${theme.gradients.header}; --skin-gradient-card: ${theme.gradients.card}; --skin-gradient-button: ${theme.gradients.button}; --skin-gradient-hover: ${theme.gradients.hover}; --skin-glow: ${theme.effects.glow}; --skin-shadow: ${theme.effects.shadow}; --skin-button-hover: ${theme.effects.buttonHover}; --skin-border-radius: ${theme.effects.borderRadius}; --skin-pattern-bg: ${theme.patterns.background}; --skin-pattern-card: ${theme.patterns.card};`;
};
