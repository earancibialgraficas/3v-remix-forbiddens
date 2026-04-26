import { useState, useEffect } from "react";
import { Flame, MessageSquare, ArrowUp, Bookmark, Shield, Ban, Trash2, Copy, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const categoryColors: Record<string, string> = {
  "arcade": "text-neon-green",
  "gaming-anime-foro": "text-neon-cyan",
  "gaming-anime-anime": "text-neon-magenta",
  "gaming-anime-gaming": "text-neon-green",
  "gaming-anime-creador": "text-neon-cyan",
  "motociclismo-riders": "text-neon-magenta",
  "motociclismo-taller": "text-neon-magenta",
  "motociclismo-rutas": "text-neon-magenta",
  "mercado-gaming": "text-neon-yellow",
  "mercado-motor": "text-neon-yellow",
};

export default function TrendingPosts() {
  const [trending, setTrending] = useState<any[]>([]);
  const { user, roles, isMasterWeb, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");

  useEffect(() => {
    const fetchTrending = async () => {
      // 🔥 FILTRAMOS EXCLUSIVAMENTE LAS CATEGORÍAS DE "ZONA DE DEBATE" 🔥
      const allowedCategories = [
        "gaming-anime-foro", 
        "gaming-anime-anime", 
        "gaming-anime-gaming", 
        "gaming-anime-creador", 
        "arcade-consejos", 
        "motociclismo-riders", 
        "motociclismo-taller", 
        "motociclismo-rutas"
      ];

      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:user_id(display_name)")
        .neq("is_banned", true)
        .in("category", allowedCategories)
        .order("upvotes", { ascending: false })
        .limit(5);
        
      if (data && !error) setTrending(data);
    };
    fetchTrending();
  }, []);

  const handleSaveToProfile = async (e: React.MouseEvent, post: any) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) {
       toast({ title: "Inicia sesión", variant: "destructive" });
       return;
    }
    try { 
      const { error } = await supabase.from("saved_items" as any).insert({ 
        user_id: user.id, 
        item_type: 'post',
        original_id: post.id,
        title: post.title || 'Post del Foro',
        redirect_url: getCategoryRoute(post.category || "gaming-anime-foro", post.id)
      }); 
      if (error && error.code === '23505') toast({ title: "Aviso", description: "Ya tienes esta publicación guardada." });
      else if (!error) toast({ title: "¡Guardado!" }); 
    } catch (e) { }
  };

  const handleHidePost = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault(); e.stopPropagation();
    const { error } = await supabase.from("posts").update({ is_banned: true } as any).eq("id", postId);
    if (!error) { 
      toast({ title: "Post ocultado." }); 
      setTrending(prev => prev.filter(p => p.id !== postId)); 
    }
  };

  const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("¿Seguro que quieres eliminar este post permanentemente?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { 
      toast({ title: "Post eliminado" }); 
      setTrending(prev => prev.filter(p => p.id !== postId)); 
    }
  };

  return (
    <section>
      <h2 className="text-sm text-neon-green text-glow-green mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4" /> // TRENDING
      </h2>
      
      {trending.length === 0 ? (
         <div className="bg-card border border-border rounded p-4 text-center opacity-50">
            <Ghost className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-[10px] font-pixel uppercase tracking-widest text-muted-foreground">Sin tendencias aún</p>
         </div>
      ) : (
        <div className="space-y-2">
          {trending.map((post) => {
            const catColor = categoryColors[post.category] || "text-neon-cyan";
            const routeUrl = getCategoryRoute(post.category || "gaming-anime-foro", post.id);

            return (
              <Link
                key={post.id}
                to={routeUrl}
                className="block bg-card border border-border rounded p-3 hover:bg-muted/30 transition-colors group relative"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                    <ArrowUp className="w-4 h-4 group-hover:text-neon-green transition-colors" />
                    <span className="text-xs font-body font-semibold">{post.upvotes || 0}</span>
                  </div>
                  
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-body">
                      <span className={cn("font-medium", catColor)}>{post.category.replace(/-/g, ' ').toUpperCase()}</span>
                      <span>•</span>
                      <span className="truncate max-w-[80px]">por {post.profiles?.display_name || "Anónimo"}</span>
                    </div>
                  </div>
                </div>

                {/* 🔥 MENÚ OVERLAY EN HOVER 🔥 */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {user && (
                    <button 
                      onClick={(e) => handleSaveToProfile(e, post)} 
                      className="p-1.5 text-muted-foreground hover:text-neon-cyan bg-card border border-border hover:border-neon-cyan rounded-md transition-colors shadow-sm" 
                      title="Guardar"
                    >
                      <Bookmark className="w-3 h-3" />
                    </button>
                  )}
                  
                  {isStaff && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} 
                          className="p-1.5 text-muted-foreground hover:text-neon-magenta bg-card border border-border hover:border-neon-magenta rounded-md transition-colors shadow-sm"
                        >
                          <Shield className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[200] bg-card border-border">
                        <DropdownMenuItem onClick={(e) => handleHidePost(e, post.id)} className="text-neon-orange cursor-pointer focus:bg-neon-orange/10">
                          <Ban className="w-3 h-3 mr-2" /> Ocultar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDeletePost(e, post.id)} className="text-destructive cursor-pointer focus:bg-destructive/10">
                          <Trash2 className="w-3 h-3 mr-2" /> Eliminar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(post.id); toast({title:"ID Copiado"}); }} className="cursor-pointer">
                          <Copy className="w-3 h-3 mr-2" /> Copiar ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}