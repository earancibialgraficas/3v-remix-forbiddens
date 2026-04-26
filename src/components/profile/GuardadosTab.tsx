import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ExternalLink, Loader2, Bookmark, PlayCircle, X, Maximize2, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";

const NEON_COLORS = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#ff00aa', '#ff5500'];

// Proxy para evitar errores CORS en imágenes externas
const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl') || url.includes('supabase.co') || url.includes('pollinations.ai')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

// Generar los colores neón para las tarjetas
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

export default function GuardadosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Mega Carrusel
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchSavedItems = async () => {
    if (!user) return;
    
    // 1. Obtener los items guardados
    const { data: savedData, error } = await supabase
      .from("saved_items" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !savedData) {
      setLoading(false);
      return;
    }

    // 2. Extraer los IDs originales para buscar su contenido real (videos, textos)
    const photoIds = savedData.filter((d: any) => d.item_type === 'photo').map((d: any) => d.original_id);
    const socialIds = savedData.filter((d: any) => d.item_type === 'social_content').map((d: any) => d.original_id);
    const postIds = savedData.filter((d: any) => d.item_type === 'post').map((d: any) => d.original_id);

    const [photosRes, socialRes, postsRes] = await Promise.all([
      photoIds.length ? supabase.from('photos').select('*').in('id', photoIds) : Promise.resolve({ data: [] }),
      socialIds.length ? supabase.from('social_content').select('*').in('id', socialIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from('posts').select('*').in('id', postIds) : Promise.resolve({ data: [] })
    ]);

    const photosMap = new Map((photosRes.data || []).map(p => [p.id, p]));
    const socialMap = new Map((socialRes.data || []).map(s => [s.id, s]));
    const postsMap = new Map((postsRes.data || []).map(p => [p.id, p]));

    // 3. Unir la info guardada con su contenido original
    const enrichedData = savedData.map((item: any) => {
        let originalData = null;
        if (item.item_type === 'photo') originalData = photosMap.get(item.original_id);
        else if (item.item_type === 'social_content') originalData = socialMap.get(item.original_id);
        else if (item.item_type === 'post') originalData = postsMap.get(item.original_id);
        return { ...item, originalData };
    });

    setItems(enrichedData);
    setLoading(false);
  };

  useEffect(() => { fetchSavedItems(); }, [user]);

  // 🔥 Lógica de bloqueo de Scroll cuando el modal está abierto 🔥
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedIndex]);

  // 🔥 EL MOTOR INTELIGENTE DE EXTRACCIÓN DE MINIATURAS 🔥
  const getThumbnailUrl = (item: any) => {
    // Si ya teníamos un thumbnail guardado válido, usarlo.
    if (item.thumbnail_url && !item.thumbnail_url.includes('undefined')) {
      return getProxyUrl(item.thumbnail_url);
    }
    
    // Si es una foto
    if (item.item_type === 'photo' && item.originalData?.image_url) {
        return getProxyUrl(item.originalData.image_url);
    }

    // Si es Social Content (Videos, Reels)
    if (item.item_type === 'social_content') {
        const url = item.originalData?.content_url || item.redirect_url || '';
        
        // Extraer de YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = "";
            if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
            else if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
            else if (url.includes("shorts/")) videoId = url.split("shorts/")[1]?.split("?")[0];
            if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
        
        // Si hay una imagen en el link (ej: terminación .png)
        if (url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return getProxyUrl(url);
    }

    // Si es un Post de Foro
    if (item.item_type === 'post') {
        const content = item.originalData?.content || '';
        
        // Buscar si hay link de imagen en el markdown del post
        const imgMatch = content.match(/\!\[.*?\]\((.*?)\)/);
        if (imgMatch) return getProxyUrl(imgMatch[1]);
        
        const rawImgMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
        if (rawImgMatch) return getProxyUrl(rawImgMatch[0]);

        // 🔥 ¡MAGIA IA! Si es puro texto, generar imagen basada en el título 🔥
        const title = item.title || item.originalData?.title || 'Gaming abstract';
        const safePrompt = encodeURIComponent(title.substring(0, 100) + " digital art neon");
        return `https://image.pollinations.ai/prompt/${safePrompt}?width=400&height=400&nologo=true`;
    }

    // Fallback genérico
    return `https://image.pollinations.ai/prompt/cyberpunk%20neon%20abstract?width=400&height=400&nologo=true`;
  };

  const isVideoItem = (item: any) => {
    const url = item.originalData?.content_url || item.redirect_url || '';
    return url.match(/\.(mp4|webm|ogg)/i) || 
           url.includes("youtube.com") || 
           url.includes("youtu.be") ||
           url.includes("tiktok.com") ||
           url.includes("instagram.com/reel");
  };

  // Renderizador principal del carrusel emergente
  const renderCarouselContent = (item: any) => {
    if (!item.originalData) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-card border border-border rounded-xl max-w-md w-full mx-auto">
          <Trash2 className="w-12 h-12 text-destructive mb-4" />
          <p className="text-white font-pixel text-xs">Publicación Original Eliminada</p>
          <p className="text-muted-foreground font-body text-[10px] mt-2">El dueño borró esta publicación.</p>
        </div>
      );
    }

    if (item.item_type === 'photo') {
       return <img src={getProxyUrl(item.originalData.image_url)} alt="Foto guardada" className="max-w-full max-h-full object-contain shadow-2xl rounded" />;
    }

    if (item.item_type === 'social_content') {
       const url = item.originalData.content_url || '';
       
       if (url.includes('youtube') || url.includes('youtu.be')) {
           let videoId = "";
           if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
           else if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
           else if (url.includes("shorts/")) videoId = url.split("shorts/")[1]?.split("?")[0];
           return <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} className="w-full max-w-4xl aspect-video rounded-xl shadow-2xl bg-black" allowFullScreen allow="autoplay" />;
       }
       if (url.includes('tiktok')) {
           const match = url.match(/video\/(\d+)/);
           if (match) return <iframe src={`https://www.tiktok.com/embed/v2/${match[1]}`} className="w-[340px] h-[600px] max-w-full max-h-[85vh] rounded-xl shadow-2xl bg-black" allowFullScreen />;
       }
       if (url.match(/\.(mp4|webm|ogg)/i)) {
           return <video src={url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl bg-black" />;
       }
       if (url.includes('instagram.com')) {
           const igMatch = url.match(/instagram\.com\/(p|reel|reels)\/([\w-]+)/);
           if (igMatch) return <iframe src={`https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/?hidecaption=true`} className="w-[400px] h-[600px] max-w-full max-h-[85vh] bg-white rounded-xl shadow-2xl" allowFullScreen />;
       }
       return <img src={getThumbnailUrl(item)} alt="Preview" className="max-w-full max-h-full object-contain rounded shadow-2xl" />;
    }

    if (item.item_type === 'post') {
       return (
          <div className="bg-card border border-border p-6 rounded-xl max-w-2xl w-full mx-auto overflow-y-auto max-h-[75vh] custom-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.8)]">
             <h2 className="text-neon-cyan font-pixel mb-4 text-sm md:text-xl leading-snug">{item.originalData.title}</h2>
             <div className="text-white font-body whitespace-pre-wrap opacity-90 text-xs md:text-sm">{item.originalData.content}</div>
          </div>
       );
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    const { error } = await supabase.from("saved_items" as any).delete().eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(item => item.id !== id));
      toast({ title: "Eliminado de guardados" });
      if (items.length <= 1) setSelectedIndex(null);
    }
  };

  const nextSlide = () => setSelectedIndex(prev => prev !== null ? (prev === items.length - 1 ? 0 : prev + 1) : null);
  const prevSlide = () => setSelectedIndex(prev => prev !== null ? (prev === 0 ? items.length - 1 : prev - 1) : null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items.length]);

  const handleGoToOrigin = () => {
    if (selectedIndex === null) return;
    const item = items[selectedIndex];
    const targetUrl = cleanUrl(item.redirect_url, item.item_type);
    navigate(targetUrl);
    setSelectedIndex(null);
  };

  if (loading) {
    return <div className="bg-card border border-border rounded p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-neon-cyan" /></div>;
  }

  return (
    <div className="bg-card border border-border rounded p-4 relative">
      <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-4 text-center md:text-left">Mis Guardados ({items.length})</h3>
      
      {items.length === 0 ? (
        <div className="py-12 text-center opacity-50 flex flex-col items-center">
          <Bookmark className="w-12 h-12 mb-3 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest">Aún no has guardado nada</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setSelectedIndex(idx)}
              className="relative group block break-inside-avoid overflow-hidden rounded-lg bg-black cursor-pointer border border-border/30 hover:border-white/20 transition-all"
              style={getNeonStyle(item)}
            >
              <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[120px]">
                <img 
                  src={getThumbnailUrl(item)} 
                  alt={item.title} 
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" 
                  loading="lazy"
                />
                {isVideoItem(item) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <PlayCircle className="w-8 h-8 text-white/80 drop-shadow-md" />
                  </div>
                )}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end">
                  <button onClick={(e) => handleRemove(e, item.id)} className="p-1.5 bg-black/60 hover:bg-destructive/90 text-white rounded transition-colors backdrop-blur-sm" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                </div>
                <div>
                  <p className="text-[9px] font-body text-white line-clamp-2 leading-tight mb-1.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-bold">{item.title || "Sin título"}</p>
                  <div className="flex items-center gap-1 text-[8px] text-neon-cyan font-pixel uppercase bg-black/60 w-fit px-1.5 py-0.5 rounded backdrop-blur-sm border border-neon-cyan/30">
                    <Maximize2 className="w-2.5 h-2.5" /> Ampliar
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 EL MEGA CARRUSEL MODAL 🔥 */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200">
          
          {/* Header del Modal */}
          <div className="flex justify-between items-center p-3 md:p-5 border-b border-white/10 shrink-0 bg-black/50">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="font-pixel text-[10px] md:text-xs text-neon-cyan truncate">{items[selectedIndex]?.title || 'Contenido Guardado'}</h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <Button size="sm" onClick={handleGoToOrigin} className="bg-neon-cyan text-black hover:bg-neon-cyan/80 text-[10px] md:text-xs font-pixel h-7 md:h-8 shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                 <span className="hidden sm:inline">Ir a publicación</span> <ExternalLink className="w-3 h-3 sm:ml-2" />
              </Button>
              <button onClick={() => setSelectedIndex(null)} className="text-white/50 hover:text-white p-1.5 bg-white/5 hover:bg-destructive rounded-full transition-all border border-white/10"><X className="w-4 h-4 md:w-5 md:h-5"/></button>
            </div>
          </div>
          
          {/* Contenido Principal (Video, Imagen, Post) */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden px-2 md:px-16 w-full">
            <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="absolute left-2 md:left-6 p-2 md:p-3 bg-black/50 hover:bg-white/10 text-white rounded-full border border-white/10 backdrop-blur-md z-50 transition-all"><ChevronLeft className="w-6 h-6 md:w-8 md:h-8" /></button>
            
            <div className="w-full h-full flex items-center justify-center p-2 md:p-4 animate-scale-in">
              {renderCarouselContent(items[selectedIndex])}
            </div>

            <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="absolute right-2 md:right-6 p-2 md:p-3 bg-black/50 hover:bg-white/10 text-white rounded-full border border-white/10 backdrop-blur-md z-50 transition-all"><ChevronRight className="w-6 h-6 md:w-8 md:h-8" /></button>
          </div>
          
          {/* Tira inferior de miniaturas (Thumbnail Strip) */}
          <div className="h-20 md:h-24 bg-black border-t border-white/10 shrink-0 flex items-center px-4 overflow-x-auto custom-scrollbar gap-2 py-2">
            {items.map((item, idx) => (
              <button 
                key={item.id} 
                onClick={() => setSelectedIndex(idx)}
                className={cn("relative h-full aspect-square md:aspect-video shrink-0 rounded-md overflow-hidden transition-all duration-300", idx === selectedIndex ? "border-2 border-neon-cyan scale-105 shadow-[0_0_15px_rgba(0,255,255,0.5)] z-10" : "opacity-40 hover:opacity-100 border border-white/10")}
              >
                <img src={getThumbnailUrl(item)} alt="" className="w-full h-full object-cover" />
                {isVideoItem(item) && <PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 text-white/80" />}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}