import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, ExternalLink, Image as ImageIcon, Loader2, Bookmark, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCategoryRoute } from "@/lib/categoryRoutes";

// 🔥 Reparador automático de URLs rotas 🔥
const cleanUrl = (url: string, itemType: string) => {
  if (!url) return "/";
  if (url === "/feed") return "/social/feed";
  if (url === "/reels") return "/social/reels";
  if (url === "/muro" || url === "/fotos") return "/social/fotos";
  
  if (itemType === "post" && url.startsWith("/") && !url.includes("/social/")) {
     const parts = url.split("?post=");
     const categoryRaw = parts[0].replace("/", "");
     const postId = parts[1];
     if (postId && categoryRaw) {
         return getCategoryRoute(categoryRaw, postId);
     }
  }
  return url;
};

// 🔥 Renderizador Inteligente de Miniaturas 🔥
function SavedMediaPreview({ url, alt }: { url: string, alt: string }) {
  if (!url) return (
    <div className="w-full aspect-square flex flex-col items-center justify-center bg-muted/20 p-2">
      <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
      <span className="text-[8px] text-muted-foreground text-center break-words w-full px-2 line-clamp-3">
        {alt || "Contenido guardado"}
      </span>
    </div>
  );

  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    let videoId = "";
    if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
    else if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
    else if (url.includes("shorts/")) videoId = url.split("shorts/")[1]?.split("?")[0];
    
    if (videoId) {
       return (
         <div className="relative w-full h-full group/video">
            <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt={alt} className="w-full h-auto object-cover min-h-[100px]" loading="lazy" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <PlayCircle className="w-8 h-8 text-white/80 drop-shadow-md" />
            </div>
         </div>
       );
    }
  }
  
  if (lowerUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/)) {
    return (
      <div className="relative w-full h-full bg-black">
        <video src={url} muted loop playsInline className="w-full h-auto object-cover min-h-[100px] pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <PlayCircle className="w-8 h-8 text-white/80 drop-shadow-md" />
        </div>
      </div>
    );
  }
  
  return (
    <img 
      src={url} 
      alt={alt} 
      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105 min-h-[100px]" 
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Error+de+Imagen";
      }}
    />
  );
}

export default function GuardadosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_items" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchSavedItems(); }, [user]);

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    const { error } = await supabase.from("saved_items" as any).delete().eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(item => item.id !== id));
      toast({ title: "Eliminado de tus guardados" });
    } else {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded p-8 flex justify-center items-center animate-in fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-4 text-center md:text-left">
        Mis Guardados ({items.length})
      </h3>
      
      {items.length === 0 ? (
        <div className="py-12 text-center opacity-50 flex flex-col items-center">
          <Bookmark className="w-12 h-12 mb-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest">
            Aún no has guardado nada
          </p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={cleanUrl(item.redirect_url, item.item_type)}
              className="relative group block break-inside-avoid overflow-hidden rounded-lg border border-border/30 hover:border-neon-cyan/50 transition-colors bg-[#09090b]"
            >
              <SavedMediaPreview url={item.thumbnail_url} alt={item.title} />
              
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end">
                  <button
                    onClick={(e) => handleRemove(e, item.id)}
                    className="p-1.5 bg-black/60 hover:bg-destructive/90 text-white rounded transition-colors backdrop-blur-sm"
                    title="Eliminar de guardados"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <p className="text-[9px] font-body text-white line-clamp-2 leading-tight mb-1.5 drop-shadow-md">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1 text-[8px] text-neon-cyan font-pixel uppercase bg-black/60 w-fit px-1.5 py-0.5 rounded backdrop-blur-sm">
                    <ExternalLink className="w-2.5 h-2.5" /> Ir al origen
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}