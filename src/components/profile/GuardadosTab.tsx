import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ExternalLink, Image as ImageIcon, Loader2, Bookmark, PlayCircle, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button"; // 🔥 IMPORTACIÓN REPARADA 🔥
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";

const NEON_COLORS = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#ff00aa', '#ff5500'];

// Proxy para saltar CORS y renderizar bien Apify/IG/TikTok
const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl') || url.includes('supabase.co')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

// Igualar los bordes de PhotoWall
const getNeonStyle = (item: any) => {
  const isNeon = item.item_type === 'social_content' || item.item_type === 'photo';
  if (!isNeon) return {}; 
  const idToUse = item.original_id || item.id || "";
  const sum = String(idToUse).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = NEON_COLORS[sum % NEON_COLORS.length];
  return {
    borderColor: color,
    boxShadow: `0 0 15px ${color}50, inset 0 0 10px ${color}20`,
    borderWidth: '2px'
  };
};

// Reparar links antiguos o 404
const cleanUrl = (url: string, itemType: string) => {
  if (!url) return "/";
  if (url === "/feed") return "/social/feed";
  if (url === "/reels") return "/social/reels";
  if (url === "/muro" || url === "/fotos") return "/social/fotos";
  
  if (itemType === "post" && url.startsWith("/") && !url.includes("/social/")) {
     const parts = url.split("?post=");
     const categoryRaw = parts[0]?.replace("/", "");
     const postId = parts[1];
     if (postId && categoryRaw) {
         return getCategoryRoute(categoryRaw, postId);
     }
  }
  return url;
};

// Extractor de miniaturas seguro
function extractVideoThumbnail(url: string, redirectUrl: string) {
   const str = (url || redirectUrl || "").toLowerCase();
   let videoId = "";
   if (str.includes("youtu.be/")) videoId = str.split("youtu.be/")[1]?.split("?")[0];
   else if (str.includes("v=")) videoId = str.split("v=")[1]?.split("&")[0];
   else if (str.includes("shorts/")) videoId = str.split("shorts/")[1]?.split("?")[0];
   
   if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
   return url; 
}

// Componente Renderizador Inteligente
function SavedMediaPreview({ item, fullSize = false }: { item: any, fullSize?: boolean }) {
  const isVideo = (item.thumbnail_url || item.redirect_url || "").match(/\.(mp4|webm|ogg)/i) || 
                  (item.redirect_url || "").includes("youtube.com") || 
                  (item.redirect_url || "").includes("youtu.be") ||
                  (item.redirect_url || "").includes("tiktok.com") ||
                  (item.redirect_url || "").includes("instagram.com/reel");

  let thumbUrl = extractVideoThumbnail(item.thumbnail_url, item.redirect_url);
  
  if (!thumbUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 p-4 min-h-[150px]">
        <ImageIcon className="w-10 h-10 text-muted-foreground/30 mb-2" />
        <span className="text-[10px] text-muted-foreground text-center break-words w-full px-2 line-clamp-3">
          {item.title || "Contenido guardado"}
        </span>
      </div>
    );
  }

  const finalUrl = getProxyUrl(thumbUrl);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <img 
        src={finalUrl} 
        alt={item.title} 
        className={cn("w-full h-auto object-cover transition-transform duration-500", !fullSize && "group-hover:scale-105 min-h-[100px]", fullSize && "max-h-[65vh] object-contain")} 
        loading="lazy"
        onError={(e) => {
          if (!e.currentTarget.src.includes('wsrv.nl')) return;
          e.currentTarget.src = thumbUrl; 
        }}
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
           <PlayCircle className={cn("text-white/90 drop-shadow-lg", fullSize ? "w-16 h-16" : "w-10 h-10")} />
        </div>
      )}
    </div>
  );
}

export default function GuardadosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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
      setSelectedItem(null);
    } else {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleGoToPost = () => {
    if (!selectedItem) return;
    const targetUrl = cleanUrl(selectedItem.redirect_url, selectedItem.item_type);
    navigate(targetUrl);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded p-8 flex justify-center items-center animate-in fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in relative">
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
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="relative group block break-inside-avoid overflow-hidden rounded-lg bg-[#09090b] cursor-pointer border border-border/30 hover:border-white/20 transition-all"
              style={getNeonStyle(item)}
            >
              <SavedMediaPreview item={item} />
              
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
                    {item.title || "Sin título"}
                  </p>
                  <div className="flex items-center gap-1 text-[8px] text-neon-cyan font-pixel uppercase bg-black/60 w-fit px-1.5 py-0.5 rounded backdrop-blur-sm">
                    <Maximize2 className="w-2.5 h-2.5" /> Ampliar
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 MODAL RESPONSIVE CON DETALLES 🔥 */}
      {selectedItem && (
        <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedItem(null)}>
          <div className="bg-card border border-neon-cyan/50 rounded-xl max-w-xl w-full flex flex-col overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.15)] animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-border flex justify-between items-center bg-black/50">
              <span className="font-pixel text-[10px] text-neon-cyan truncate pr-4">{selectedItem.title || 'Contenido Guardado'}</span>
              <button onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-white p-1 bg-muted/20 rounded-full transition-colors"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="bg-black relative flex items-center justify-center min-h-[250px] max-h-[60vh] overflow-hidden">
              <SavedMediaPreview item={selectedItem} fullSize={true} />
            </div>
            
            <div className="p-3 md:p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-card/95">
              <Button variant="destructive" size="sm" onClick={(e) => handleRemove(e, selectedItem.id)} className="w-full sm:w-auto text-xs font-pixel tracking-tighter">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
              </Button>
              <Button size="sm" onClick={handleGoToPost} className="w-full sm:w-auto bg-neon-cyan text-black hover:bg-neon-cyan/80 text-xs font-pixel tracking-tighter shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                Ir a la Publicación <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}