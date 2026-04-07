// Maps DB category values to their correct routes
const categoryRouteMap: Record<string, string> = {
  "general": "/",
  "gaming-anime": "/gaming-anime",
  "gaming-anime-foro": "/gaming-anime/foro",
  "gaming-anime-anime": "/gaming-anime/anime",
  "gaming-anime-creador": "/gaming-anime/creador",
  "motociclismo": "/motociclismo",
  "motociclismo-riders": "/motociclismo/riders",
  "motociclismo-taller": "/motociclismo/taller",
  "motociclismo-rutas": "/motociclismo/rutas",
  "mercado": "/mercado",
  "mercado-gaming": "/mercado/gaming",
  "mercado-motor": "/mercado/motor",
  "social": "/social",
  "social-feed": "/social/feed",
  "trending": "/trending",
  "eventos": "/eventos",
};

export function getCategoryRoute(category: string, postId?: string): string {
  const base = categoryRouteMap[category] || `/${category}`;
  return postId ? `${base}?post=${postId}` : base;
}
