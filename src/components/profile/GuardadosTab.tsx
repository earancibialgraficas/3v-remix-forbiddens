import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Trash2, ExternalLink, Loader2, Bookmark, PlayCircle, X, Maximize2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Image as ImageIcon, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";

const cleanUrl = (url: string, itemType: string) => {
  if (!url) return "/";
  
  if (url.startsWith("/feed")) return url.replace(/^\/feed/, "/social/feed");
  if (url.startsWith("/reels")) return url.replace(/^\/reels/, "/social/reels");
  if (url.startsWith("/muro") || url.startsWith("/fotos")) return url.replace(/^\/(muro|fotos)/, "/social/fotos");
  
  if (itemType === "post" && url.startsWith("/") && !url.includes("/social/")) {
     const parts = url.split("?post=");
     const categoryRaw = parts[0]?.replace("/", "");
     const postId = parts[1];
     if (postId && categoryRaw) return getCategoryRoute(categoryRaw, postId);
  }
  return url;
};

const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.toLowerCase().includes('.gif')) return url;
  if (url.includes('wsrv.nl') || url.includes('supabase.co') || url.includes('pollinations.ai') || url.includes('img.youtube.com') || url.includes('tiktokcdn.com')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

const isVideoItem = (item: any) => {
  const url = item.originalData?.content_url || item.redirect_url || '';
  return Boolean(url.match(/\.(mp4|webm|ogg)/i) || url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com") || url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch"));
};

const getCardBorderStyle = (item: any) => {
  const isVideo = isVideoItem(item);
  const isPost = item.item_type === 'post';
  
  let borderColor = '#00f0ff'; 
  if (isVideo) borderColor = '#ff6b00'; 
  else if (isPost) borderColor = '#ff00ff'; 

  return { 
    borderColor, 
    borderWidth: '1px',
    borderStyle: 'solid'
  };
};

const getSeedFromId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

// 🔥 COMPONENTE DE VIDEO: Mute removido, Autoplay activo con sonido 🔥
function HubStyleVideoEmbed({ item }: { item: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const url = item.originalData?.content_url || '';
  
  let platform = item.originalData?.platform || 'web';
  if (!item.originalData?.platform) {
     if (url.includes('tiktok.com')) platform = 'tiktok';
     else if (url.includes('instagram.com')) platform = 'instagram';
     else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
     else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) platform = 'facebook';
  }

  const cType = item.originalData?.content_type || 'video';

  const getBaseSize = (plat: string, type: string, contentUrl: string) => {
    if (plat === 'tiktok') return { w: 340, h: 605 };
    if (plat === 'instagram') {
      if (type === 'reel' || contentUrl?.includes('/reel')) return { w: 340, h: 605 };
      return { w: 400, h: 500 }; 
    }
    if (plat === 'facebook') {
      if (type === 'reel' || contentUrl?.includes('/reel/')) return { w: 324, h: 576 };
      return { w: 560, h: 315 };
    }
    if (type === 'reel' || contentUrl?.includes('shorts')) return { w: 324, h: 576 };
    return { w: 640, h: 360 };
  };

  const baseSize = getBaseSize(platform, cType, url);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const safeWidth = width - 16;
        const safeHeight = height - 16;
        const scaleX = safeWidth / baseSize.w;
        const scaleY = safeHeight / baseSize.h;
        let newScale = Math.min(scaleX, scaleY);
        newScale = Math.min(newScale, 1.2); 
        setScale(newScale);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [baseSize.w, baseSize.h]);

  const getEmbedUrl = () => {
    // 🔥 Ya no hay "&mute=1", ahora sonarán 🔥
    if (platform === "youtube") {
      const shortMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
      if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1`;
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    if (platform === "instagram") {
      const igMatch = url.match(/instagram\.com\/(p|reel|reels)\/([\w-]+)/);
      if (igMatch) return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/?hidecaption=true`;
    }
    if (platform === "tiktok") {
      const tkMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
      if (tkMatch) return `https://www.tiktok.com/embed/v2/${tkMatch[1]}?autoplay=1`;
      const tkMatch2 = url.match(/tiktok\.com\/.*?video\/(\d+)/);
      if (tkMatch2) return `https://www.tiktok.com/embed/v2/${tkMatch2[1]}?autoplay=1`;
    }
    if (platform === "facebook") {
      const encodedUrl = encodeURIComponent(url);
      return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=560&autoplay=true`;
    }
    return url;
  };

  const finalEmbedUrl = getEmbedUrl();

  return (
    <div ref={containerRef} className="flex-1 min-h-0 w-full h-full relative overflow-hidden bg-[#09090b]">
       <div 
          className="absolute top-1/2 left-1/2 flex items-center justify-center transition-transform duration-75 origin-center"
          style={{ 
            width: `${baseSize.w}px`,
            height: `${baseSize.w === 640 ? 'auto' : baseSize.h + 'px'}`,
            aspectRatio: baseSize.w === 640 ? '16/9' : 'auto',
            transform: `translate(-50%, -50%) scale(${scale})`
          }}
        >
          <iframe 
            src={finalEmbedUrl} 
            className={cn("w-full h-full bg-transparent outline-none rounded-xl shadow-2xl", 
              platform === 'instagram' || platform === 'facebook' ? "bg-white" : ""
            )}
            style={{ border: "none" }}
            scrolling="no"
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          />
        </div>
    </div>
  );
}

function PostCarouselItem({ item, getThumbnailUrl }: { item: any, getThumbnailUrl: (item: any) => string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card w-full h-full flex flex-col md:flex-row overflow-hidden relative">
      <div className={cn(
        "relative flex items-center justify-center bg-black transition-all duration-500 ease-in-out",
        expanded ? "h-[65%] md:h-full md:w-[65%]" : "flex-1 min-h-0 w-full h-full"
      )}>
         <img src={getThumbnailUrl(item)} className="w-full h-full object-cover opacity-90" alt="Post Cover" />
         
         {!expanded && (
            <div className="absolute right-0 top-0 h-full hidden md:flex items-center z-10">
              <button onClick={() => setExpanded(true)} className="bg-black/70 hover:bg-neon-cyan/20 h-full px-3 transition-colors border-l border-white/10 flex flex-col items-center justify-center text-neon-cyan group backdrop-blur-sm">
                <ChevronLeft className="w-6 h-6 mb-4 group-hover:-translate-x-1 transition-transform" />
                <span className="font-pixel text-[10px] [writing-mode:vertical-rl] rotate-180 uppercase tracking-widest">Ver Texto Original</span>
              </button>
            </div>
         )}

         {!expanded && (
            <div className="absolute bottom-0 w-full md:hidden flex justify-center z-10">
              <button onClick={() => setExpanded(true)} className="w-full bg-black/80 hover:bg-neon-cyan/20 text-neon-cyan py-3.5 flex items-center justify-center gap-2 border-t border-white/10 backdrop-blur-md transition-colors group">
                 <span className="font-pixel text-[10px] uppercase tracking-widest">Ver Texto Original</span>
                 <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
         )}
      </div>

      <div className={cn(
        "flex flex-col bg-card/95 border-t md:border-t-0 md:border-l border-white/10 transition-all duration-500 ease-in-out",
        expanded ? "h-[35%] md:h-full md:w-[35%] opacity-100" : "h-0 md:h-full md:w-0 opacity-0 overflow-hidden"
      )}>
        <button
          onClick={() => setExpanded(false)}
          className="w-full p-3 md:p-4 flex items-center justify-between text-neon-cyan hover:bg-white/5 transition-colors z-10 border-b border-white/5 shrink-0"
        >
          <span className="font-pixel text-[9px] uppercase tracking-widest">Cerrar Texto</span>
          <ChevronDown className="w-4 h-4 md:hidden" />
          <ChevronRight className="w-4 h-4 hidden md:block" />
        </button>

        <div className="p-4 md:p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar w-full">
          <h2 className="text-neon-cyan font-pixel mb-4 text-xs md:text-sm leading-relaxed break-words w-full">
            {item.originalData?.title}
          </h2>
          <div className="text-slate-300 font-sans font-light text-[12px] md:text-[14px] leading-relaxed tracking-wide whitespace-pre-wrap break-words w-full">
            {item.originalData?.content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuardadosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  const fetchSavedItems = async () => {
    if (!user) return;
    const { data: savedData, error } = await supabase.from("saved_items" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error || !savedData) { setLoading(false); return; }

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

    const authorIds = new Set<string>();
    photosRes.data?.forEach(p => authorIds.add(p.user_id));
    socialRes.data?.forEach(s => authorIds.add(s.user_id));
    postsRes.data?.forEach(p => authorIds.add(p.user_id));

    const { data: profilesRes } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', Array.from(authorIds));
    const profilesMap = new Map((profilesRes || []).map(p => [p.user_id, p]));

    const enrichedData = savedData.map((item: any) => {
        let originalData = null;
        if (item.item_type === 'photo') originalData = photosMap.get(item.original_id);
        else if (item.item_type === 'social_content') originalData = socialMap.get(item.original_id);
        else if (item.item_type === 'post') originalData = postsMap.get(item.original_id);
        if (originalData && originalData.user_id) originalData.profile = profilesMap.get(originalData.user_id);
        return { ...item, originalData };
    });

    const finalData = await Promise.all(enrichedData.map(async (item: any) => {
       if (item.item_type === 'social_content') {
          const url = item.originalData?.content_url || item.redirect_url || '';
          
          if (url.includes('tiktok.com')) {
             try {
                const res = await fetch(`https://www.tiktok.com/oembed?url=${url}`);
                const json = await res.json();
                if (json.thumbnail_url) item.tiktok_thumb = json.thumbnail_url;
             } catch(e) { console.error("Error TikTok oEmbed", e); }
          } 
          else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
             let fbThumbFound = false;
             try {
                const res = await fetch(`https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                   const json = await res.json();
                   if (json.thumbnail_url) {
                       item.facebook_thumb = json.thumbnail_url;
                       fbThumbFound = true;
                   }
                }
             } catch(e) { console.error("Error Facebook oEmbed", e); }
             
             if (!fbThumbFound) {
                 try {
                     const fallbackRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
                     if (fallbackRes.ok) {
                         const fallbackJson = await fallbackRes.json();
                         if (fallbackJson.data?.image?.url) {
                             item.facebook_thumb = fallbackJson.data.image.url;
                         }
                     }
                 } catch(e) { console.error("Error Microlink Fallback", e); }
             }
          }
       }
       return item;
    }));

    setItems(finalData);
    setLoading(false);
  };

  useEffect(() => { fetchSavedItems(); }, [user]);

  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
      setIsTextExpanded(false);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedIndex]);

  // 🔥 SOLUCIÓN A LA IA DE MINIATURAS (API ACTUALIZADA) 🔥
  const getThumbnailUrl = (item: any) => {
    let origContentUrl = item.originalData?.content_url || item.redirect_url || '';
    const isVideoExt = (url: string) => url && url.match(/\.(mp4|webm|ogg)/i);
    const idSeed = getSeedFromId(item.original_id || item.id);

    const ytMatch = origContentUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    
    if (item.tiktok_thumb) return getProxyUrl(item.tiktok_thumb);
    if (item.facebook_thumb) return getProxyUrl(item.facebook_thumb);

    if (origContentUrl.includes('instagram.com')) {
       const igMatch = origContentUrl.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/);
       if (igMatch) return getProxyUrl(`https://www.instagram.com/p/${igMatch[1]}/media/?size=l`);
    }

    let savedThumb = item.thumbnail_url;
    if (savedThumb && !isVideoExt(savedThumb) && !savedThumb.includes('undefined')) return getProxyUrl(savedThumb);
    let origImg = item.originalData?.image_url || item.originalData?.thumbnail_url;
    if (origImg && !isVideoExt(origImg)) return getProxyUrl(origImg);

    // API de Pollinations Actualizada y blindada contra fallos
    if (item.item_type === 'post') {
       const content = item.originalData?.content || '';
       const imgMatch = content.match(/\!\[.*?\]\((.*?)\)/);
       if (imgMatch && !isVideoExt(imgMatch[1])) return getProxyUrl(imgMatch[1]);
       
       const rawImgMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
       if (rawImgMatch && !isVideoExt(rawImgMatch[0])) return getProxyUrl(rawImgMatch[0]);
       
       const title = (item.title || item.originalData?.title || 'Foro').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Gaming';
       return `https://pollinations.ai/p/${encodeURIComponent(title.substring(0, 40) + " digital art neon")}?width=400&height=400&nologo=true&seed=${idSeed}`;
    }

    const title = (item.title || item.originalData?.title || item.originalData?.caption || 'Content').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Cyberpunk';
    return `https://pollinations.ai/p/${encodeURIComponent(title.substring(0, 40) + " cyberpunk neon grid")}?width=400&height=400&nologo=true&seed=${idSeed}`;
  };

  const renderMediaOnly = (item: any) => {
    if (!item.originalData) {
      return (
        <div className="flex-1 min-h-0 w-full h-full flex flex-col items-center justify-center text-center p-8 bg-card overflow-hidden">
          <Trash2 className="w-12 h-12 text-destructive mb-4" />
          <p className="text-white font-pixel text-xs">Publicación Eliminada</p>
        </div>
      );
    }

    if (item.item_type === 'photo' || item.originalData?.is_apify) {
       const img = item.originalData?.image_url || item.thumbnail_url;
       return (
         <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden">
           <img src={getProxyUrl(img)} className="w-full h-full object-contain shadow-2xl rounded" />
         </div>
       );
    }

    if (item.item_type === 'social_content') {
       const url = item.originalData.content_url || '';
       
       if (url.includes('youtube') || url.includes('youtu.be') || url.includes('tiktok.com') || url.includes('instagram.com') || url.includes('facebook.com') || url.includes('fb.watch')) {
           return <HubStyleVideoEmbed item={item} />;
       }

       if (url.match(/\.(mp4|webm|ogg)/i)) {
           return (
             <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden bg-black">
               {/* Se removió el muted para que el MP4 directo también tenga volumen al hacerle clic */}
               <video src={url} controls autoPlay playsInline loop className="w-full h-full object-contain rounded-xl shadow-2xl bg-black" />
             </div>
           );
       }
       
       return (
         <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden">
           <img src={getThumbnailUrl(item)} className="w-full h-full object-contain rounded shadow-2xl" />
         </div>
       );
    }

    if (item.item_type === 'post') {
       return (
         <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden">
           <img src={getThumbnailUrl(item)} className="w-full h-full object-contain shadow-2xl rounded" alt="Post Cover" />
         </div>
       );
    }
  };

  const renderCarouselContentMobile = (item: any) => {
    if (!item.originalData) return renderMediaOnly(item);
    if (item.item_type === 'post') return <PostCarouselItem item={item} getThumbnailUrl={getThumbnailUrl} />;
    return renderMediaOnly(item);
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

  const handleGoToOrigin = () => {
    if (selectedIndex === null) return;
    navigate(cleanUrl(items[selectedIndex].redirect_url, items[selectedIndex].item_type));
    setSelectedIndex(null);
  };

  const nextSlide = () => { setSelectedIndex(prev => prev !== null ? (prev === items.length - 1 ? 0 : prev + 1) : null); setIsTextExpanded(false); };
  const prevSlide = () => { setSelectedIndex(prev => prev !== null ? (prev === 0 ? items.length - 1 : prev - 1) : null); setIsTextExpanded(false); };

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
    setTouchStart(null);
  };

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

  if (loading) return <div className="bg-card border border-border rounded p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-neon-cyan" /></div>;

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
              className="relative group block break-inside-avoid overflow-hidden rounded-lg bg-black cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" 
              style={getCardBorderStyle(item)}
            >
              <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[120px]">
                <img src={getThumbnailUrl(item)} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" loading="lazy" />
                {isVideoItem(item) && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><PlayCircle className="w-8 h-8 text-white/80 drop-shadow-md" /></div>}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end"><button onClick={(e) => handleRemove(e, item.id)} className="p-1.5 bg-black/60 hover:bg-destructive/90 text-white rounded"><Trash2 className="w-3 h-3" /></button></div>
                <div>
                  <p className="text-[9px] font-body text-white line-clamp-2 leading-tight mb-1.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-bold">{item.title || "Sin título"}</p>
                  <div className="flex items-center gap-1 text-[8px] text-neon-cyan font-pixel uppercase bg-black/60 w-fit px-1.5 py-0.5 rounded backdrop-blur-sm border border-neon-cyan/30"><Maximize2 className="w-2.5 h-2.5" /> Ampliar</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 MEGA CARRUSEL PORTAL 🔥 */}
      {selectedIndex !== null && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md" 
          onClick={() => setSelectedIndex(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >

          {/* 📱 VERSIÓN CELULAR 📱 */}
          <div className="md:hidden flex flex-col absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md h-[80vh] bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/80 shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                   <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 border border-white/20 flex items-center justify-center">
                      {items[selectedIndex]?.originalData?.profile?.avatar_url ? <img src={items[selectedIndex].originalData.profile.avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 text-muted-foreground"/>}
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-pixel text-white truncate">{items[selectedIndex]?.originalData?.profile?.display_name || "Anónimo"}</span>
                      <span className="text-[10px] font-body text-muted-foreground truncate">{items[selectedIndex]?.title || "Guardado"}</span>
                   </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={handleGoToOrigin} className="bg-neon-cyan text-black hover:bg-neon-cyan/80 text-[9px] font-pixel h-7 px-2"><ExternalLink className="w-3 h-3" /></Button>
                  <button onClick={() => setSelectedIndex(null)} className="text-white/70 hover:text-white hover:bg-destructive p-1 rounded transition-all border border-white/10"><X className="w-4 h-4"/></button>
                </div>
             </div>
             <div className="flex-1 relative flex items-center justify-center bg-black/40 min-h-0 overflow-hidden w-full">
                {renderCarouselContentMobile(items[selectedIndex])}
             </div>
             <div className="h-20 bg-black/90 border-t border-white/10 shrink-0 flex items-center px-3 overflow-x-auto custom-scrollbar gap-2 py-2">
                {items.map((item, idx) => (
                  <button key={item.id} onClick={() => setSelectedIndex(idx)} className={cn("relative h-14 w-14 shrink-0 rounded-md overflow-hidden transition-all", idx === selectedIndex ? "border-2 border-white scale-105 shadow-[0_0_10px_rgba(255,255,255,0.3)] z-10" : "opacity-40 hover:opacity-100 border border-white/10")}>
                    <img src={getThumbnailUrl(item)} className="w-full h-full object-cover" alt="" />
                    {isVideoItem(item) && <PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />}
                  </button>
                ))}
             </div>
          </div>

          {/* 💻 VERSIÓN PC (Split 70/30) 💻 */}
          <div className="hidden md:flex flex-row absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-6xl h-[85vh] bg-card border border-white/10 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-scale-in" onClick={e => e.stopPropagation()}>
            
            <div className="relative w-[70%] h-full bg-black flex items-center justify-center overflow-hidden shrink-0 group">
              <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="absolute left-4 z-50 p-3 bg-black/50 hover:bg-white/10 text-white rounded-full border border-white/10 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"><ChevronLeft className="w-8 h-8" /></button>
              
              <div className="flex-1 min-h-0 overflow-hidden w-full h-full flex items-center justify-center relative p-0 md:p-4">
                {renderMediaOnly(items[selectedIndex])}
              </div>
              
              <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="absolute right-4 z-50 p-3 bg-black/50 hover:bg-white/10 text-white rounded-full border border-white/10 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"><ChevronRight className="w-8 h-8" /></button>
            </div>
            
            <div className="w-[30%] h-full flex flex-col bg-card/95 border-l border-white/10">
              {(() => {
                 const item = items[selectedIndex];
                 const author = item?.originalData?.profile || {};
                 return (
                   <div className="p-4 border-b border-white/10 shrink-0 bg-black/40">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                           <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 border border-white/20 flex items-center justify-center">
                              {author.avatar_url ? <img src={author.avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-5 h-5 text-muted-foreground"/>}
                           </div>
                           <div className="flex flex-col min-w-0">
                              <span className="text-xs font-pixel text-white truncate">{author.display_name || "Usuario Anónimo"}</span>
                              <span className="text-[10px] font-body text-muted-foreground truncate">{item?.title || "Contenido guardado"}</span>
                           </div>
                        </div>
                        <button onClick={() => setSelectedIndex(null)} className="text-white/70 hover:text-white hover:bg-destructive p-1.5 rounded transition-all border border-white/10 shrink-0" title="Cerrar"><X className="w-5 h-5"/></button>
                     </div>
                     <Button size="sm" onClick={handleGoToOrigin} className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/80 text-xs font-pixel shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                        Ir a publicación <ExternalLink className="w-4 h-4 ml-2" />
                     </Button>
                   </div>
                 );
              })()}

              {items[selectedIndex]?.item_type === 'post' && (
                 <div className="shrink-0 border-b border-white/10 bg-black/20">
                    <button onClick={() => setIsTextExpanded(!isTextExpanded)} className="w-full p-4 flex items-center justify-between text-neon-cyan hover:bg-white/5 transition-colors">
                       <span className="font-pixel text-[10px] uppercase tracking-widest">{isTextExpanded ? "Ocultar Texto" : "Ver Texto Original"}</span>
                       {isTextExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isTextExpanded && (
                       <div className="p-4 max-h-[40vh] overflow-y-auto overflow-x-hidden custom-scrollbar w-full border-t border-white/5 bg-black/40">
                         <h2 className="text-neon-cyan font-pixel mb-4 text-sm leading-relaxed break-words w-full">{items[selectedIndex]?.originalData?.title}</h2>
                         <div className="text-slate-300 font-sans font-light text-[13px] leading-relaxed tracking-wide whitespace-pre-wrap break-words w-full">
                           {items[selectedIndex]?.originalData?.content}
                         </div>
                       </div>
                    )}
                 </div>
              )}

              {items[selectedIndex]?.item_type !== 'post' && (items[selectedIndex]?.originalData?.caption || items[selectedIndex]?.title) && (
                 <div className="p-4 shrink-0 border-b border-white/10 bg-black/20 max-h-[25vh] overflow-y-auto custom-scrollbar">
                    <div className="text-slate-300 font-sans font-light text-[13px] leading-relaxed tracking-wide whitespace-pre-wrap break-words w-full">
                      {items[selectedIndex]?.originalData?.caption || items[selectedIndex]?.title}
                    </div>
                 </div>
              )}
              
              <div className="flex-1 bg-black/60 p-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
                  {items.map((item, idx) => (
                    <button 
                      key={item.id} 
                      onClick={() => setSelectedIndex(idx)}
                      className={cn("relative aspect-square rounded-md overflow-hidden transition-all duration-300", idx === selectedIndex ? "border-2 border-white scale-105 shadow-[0_0_10px_rgba(255,255,255,0.3)] z-10" : "opacity-50 hover:opacity-100 border border-white/10")}
                    >
                      <img src={getThumbnailUrl(item)} className="w-full h-full object-cover" alt="" />
                      {isVideoItem(item) && <PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />}
                    </button>
                  ))}
                </div>
              </div>
              
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}