import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Youtube, Instagram, Globe, Facebook, Link as LinkIcon, X, PlayCircle, Clock, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// 🔥 UTILIDADES PARA MINIATURAS 🔥
const getSeedFromId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl') || url.includes('supabase.co') || url.includes('pollinations.ai')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

const getSocialThumbnail = (item: any) => {
  if (item.target_type === 'photo' || item.image_url) return getProxyUrl(item.image_url);
  let origContentUrl = item.content_url || '';
  const isVideoExt = (url: string) => url && url.match(/\.(mp4|webm|ogg)/i);
  const idSeed = getSeedFromId(item.id);

  const ytMatch = origContentUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  
  if (item.tiktok_thumb) return getProxyUrl(item.tiktok_thumb);
  if (item.facebook_thumb) return getProxyUrl(item.facebook_thumb);

  if (origContentUrl.includes('instagram.com')) {
     const igMatch = origContentUrl.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/);
     if (igMatch) return getProxyUrl(`https://www.instagram.com/p/${igMatch[1]}/media/?size=l`);
  }

  if (item.thumbnail_url && !isVideoExt(item.thumbnail_url)) return getProxyUrl(item.thumbnail_url);
  
  const title = (item.title || item.caption || item.content_type || 'Content').replace(/[^a-zA-Z0-9 ]/g, '');
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(title.substring(0, 50) + " cyberpunk neon grid")}?width=400&height=400&nologo=true&seed=${idSeed}`;
};

const isVideoItem = (item: any) => {
  if (item.target_type === 'photo') return false;
  const url = item.content_url || '';
  return Boolean(url.match(/\.(mp4|webm|ogg)/i) || url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com") || url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch"));
};

const getPlatformIcon = (platform: string, targetType: string, className: string = "w-4 h-4") => {
  if (targetType === 'photo') return <Camera className={cn(className, "text-neon-cyan")} />;
  
  switch (platform?.toLowerCase()) {
    case "youtube": return <Youtube className={cn(className, "text-[#ff0000]")} />;
    case "instagram": return <Instagram className={cn(className, "text-[#e1306c]")} />;
    case "facebook": return <Facebook className={cn(className, "text-[#1877f2]")} />;
    case "tiktok": return <Globe className={cn(className, "text-[#00f2fe]")} />; 
    default: return <LinkIcon className={cn(className, "text-muted-foreground")} />;
  }
};

const getTimeAgo = (dateString: string) => {
  if (!dateString) return "Recientemente";
  const safeDateStr = dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+') ? dateString + 'Z' : dateString;
  const date = new Date(safeDateStr);
  if (date.getFullYear() <= 1970) return "Recientemente";

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  
  let interval = seconds / 31536000;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "año" : "años"}`;
  
  interval = seconds / 2592000;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "mes" : "meses"}`;
  
  interval = seconds / 86400;
  if (interval >= 1) {
      if (Math.floor(interval) === 1) return "ayer";
      return `hace ${Math.floor(interval)} días`;
  }
  
  interval = seconds / 3600;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "hr" : "hrs"}`;
  
  interval = seconds / 60;
  if (interval >= 1) return `hace ${Math.floor(interval)} min`;
  
  return "hace un momento";
};

export default function SocialContentTab({ profile, user, onEditNetworks, limits, isStaff }: any) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contents, setContents] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  // 🔥 ESTADOS PARA EL MODAL DE ELIMINAR 🔥
  const [contentToRemove, setContentToRemove] = useState<{ id: string; title: string; targetType: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Congelar el scroll del fondo mientras el modal está abierto
  useEffect(() => {
    if (contentToRemove) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [contentToRemove]);

  // Motor de tiempo real para las fechas
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchContents = async () => {
    // Buscar tanto del Social Hub como del Muro de Fotos
    const [
      { data: rawSocialContent },
      { data: rawPhotos }
    ] = await Promise.all([
      supabase.from("social_content").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("photos").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    let combinedSocial = [];
    if (rawSocialContent) combinedSocial.push(...rawSocialContent.map(s => ({...s, target_type: 'social_content'})));
    if (rawPhotos) combinedSocial.push(...rawPhotos.map(p => ({...p, target_type: 'photo'})));
    
    // Ordenar todo por fecha
    combinedSocial.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Resolvemos miniaturas de oEmbed (TikTok, Facebook) al vuelo
    const finalData = await Promise.all(combinedSocial.map(async (item: any) => {
        if (item.target_type === 'social_content') {
            const url = item.content_url || '';
            if (url.includes('tiktok.com')) {
               try {
                  const res = await fetch(`https://www.tiktok.com/oembed?url=${url}`);
                  const json = await res.json();
                  if (json.thumbnail_url) item.tiktok_thumb = json.thumbnail_url;
               } catch(e) {}
            } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
               let fbThumbFound = false;
               try {
                  const res = await fetch(`https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(url)}`);
                  if (res.ok) {
                     const json = await res.json();
                     if (json.thumbnail_url) { item.facebook_thumb = json.thumbnail_url; fbThumbFound = true; }
                  }
               } catch(e) {}
               if (!fbThumbFound) {
                   try {
                       const fallbackRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
                       if (fallbackRes.ok) {
                           const fallbackJson = await fallbackRes.json();
                           if (fallbackJson.data?.image?.url) item.facebook_thumb = fallbackJson.data.image.url;
                       }
                   } catch(e) {}
               }
            }
        }
       return item;
    }));

    setContents(finalData);
  };

  useEffect(() => { 
    fetchContents(); 
  }, [user.id]);

  const reachedLimit = !isStaff && contents.length >= limits.maxSocialContent;

  const handleAddLink = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    
    let platform = "web";
    let contentType = "post";
    const url = newUrl.toLowerCase();
    
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      platform = "youtube";
      contentType = url.includes("shorts") ? "reel" : "video";
    } else if (url.includes("instagram.com")) {
      platform = "instagram";
      contentType = (url.includes("/reel/") || url.includes("/reels/")) ? "reel" : "post";
    } else if (url.includes("tiktok.com")) {
      platform = "tiktok";
      contentType = "reel"; 
    } else if (url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.com")) {
      platform = "facebook";
      if (url.includes("/reel/")) contentType = "reel";
      else if (url.includes("/video") || url.includes("watch") || url.includes("fb.watch")) contentType = "video";
      else contentType = "post";
    }
    
    const { error } = await supabase.from("social_content").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      content_url: newUrl.trim(),
      title: newTitle.trim() || null,
      platform: platform,
      content_type: contentType,
      is_public: true
    } as any);
    
    setAdding(false);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Añadido al Social Hub", description: `Clasificado como ${platform} ${contentType}` });
      setNewUrl("");
      setNewTitle("");
      fetchContents();
    }
  };

  // 🔥 FUNCIÓN DEL MODAL DE ELIMINAR (Inteligente para fotos o videos) 🔥
  const confirmRemoveContent = async () => {
    if (!contentToRemove) return;
    setIsRemoving(true);
    try {
      const table = contentToRemove.targetType === 'photo' ? 'photos' : 'social_content';
      const { error } = await supabase.from(table).delete().eq("id", contentToRemove.id);
      if (error) throw error;
      toast({ title: "Publicación eliminada", description: `El contenido ha sido borrado exitosamente.` });
      fetchContents();
    } catch(e) {
      toast({ title: "Error", description: "No se pudo eliminar la publicación.", variant: "destructive" });
    } finally {
      setIsRemoving(false);
      setContentToRemove(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in relative">
      
      {/* HEADER: BOTÓN DE REDES SOCIALES */}
      <div className="bg-card border rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] opacity-60 mb-3 uppercase font-pixel tracking-tighter">
          Perfiles de Redes Sociales
        </h3>
        <Button variant="outline" onClick={onEditNetworks} className="w-full text-xs">
          Editar Vínculos de Perfil
        </Button>
      </div>

      {/* FORMULARIO DE PUBLICAR */}
      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body">
           <h3 className="font-pixel text-neon-cyan uppercase">Publicar en Social Hub</h3>
           <span>Límite: {contents.length} / {limits.maxSocialContent >= 999 ? "∞" : limits.maxSocialContent} posts</span>
        </div>
        
        <Input 
          placeholder="URL (YouTube, Instagram, TikTok, Facebook...)" 
          value={newUrl} 
          onChange={e => setNewUrl(e.target.value)} 
          className="h-8 bg-muted text-xs w-full font-body"
          disabled={reachedLimit}
        />

        {reachedLimit && (
          <p className="text-[10px] text-destructive/80 font-body italic text-center">
            Has alcanzado el límite de publicaciones de tu membresía.
          </p>
        )}

        <Input 
          placeholder="Título o descripción (Opcional)" 
          value={newTitle} 
          onChange={e => setNewTitle(e.target.value)} 
          className="h-8 bg-muted text-xs w-full font-body"
          disabled={reachedLimit}
        />
        
        <Button 
          size="sm" 
          onClick={handleAddLink} 
          disabled={adding || !newUrl.trim() || reachedLimit} 
          className="w-full text-xs bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel"
        >
          {reachedLimit ? "Límite Alcanzado" : adding ? "Publicando..." : "Publicar en el Hub"}
        </Button>
      </div>
      
      {/* 🔥 CUADRÍCULA DE CONTENIDO SOCIAL (RESPONSIVA AUTO-FIT) 🔥 */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] opacity-80 mb-4 uppercase text-center md:text-left">
          Tu Contenido Publicado
        </h3>
        
        {contents.length === 0 ? (
           <p className="text-xs text-muted-foreground text-center py-6 font-body opacity-60 italic">
             Aún no has publicado nada.
           </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
            {contents.map(c => {
              const borderStyle = isVideoItem(c) ? "border-[#ff6b00]/50 hover:border-[#ff6b00]" : "border-[#00f0ff]/50 hover:border-[#00f0ff]";
              const destRoute = c.target_type === 'photo' ? `/social/fotos?post=${c.id}` : `/social/reels?post=${c.id}`;

              return (
                <div 
                  key={c.id} 
                  className={cn("flex flex-col bg-muted/10 border rounded-lg overflow-hidden transition-all group cursor-pointer shadow-sm hover:shadow-md", borderStyle)}
                  onClick={() => navigate(destRoute)}
                >
                   {/* IMAGEN Y OVERLAYS */}
                   <div className="relative aspect-square bg-black overflow-hidden shrink-0">
                       <img 
                         src={getSocialThumbnail(c)} 
                         className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" 
                         loading="lazy"
                         alt=""
                       />
                       
                       {/* Icono de Reproducción si es Video/Reel */}
                       {isVideoItem(c) && (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                           <PlayCircle className="w-8 h-8 text-white/80 drop-shadow-md group-hover:scale-110 transition-transform" />
                         </div>
                       )}
                       
                       {/* Icono de la Red Social o Cámara en la esquina inferior derecha */}
                       <div className="absolute bottom-2 right-2 bg-black/70 p-1.5 rounded-full backdrop-blur-md border border-white/10 z-20">
                           {getPlatformIcon(c.platform, c.target_type)}
                       </div>

                       {/* Botón de Eliminar en la esquina superior derecha */}
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setContentToRemove({id: c.id, title: c.title || c.caption || "Publicación", targetType: c.target_type}); 
                         }} 
                         className="absolute top-2 right-2 bg-black/80 hover:bg-destructive text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm"
                         title="Eliminar Publicación"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                   </div>
                   
                   {/* TEXTO INFERIOR CON FECHA */}
                   <div className="p-3 bg-black/20 flex flex-col justify-center h-full">
                       <p className="text-[11px] font-bold font-body line-clamp-2 text-foreground group-hover:text-neon-cyan transition-colors leading-snug">
                          {c.title || c.caption ? (c.title || c.caption) : (c.target_type === 'photo' ? "Imagen Publicada" : c.content_type === "reel" ? "Reel Publicado" : "Video Publicado")}
                       </p>
                       <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground font-body">
                          <Clock className="w-3 h-3" />
                          <span title={new Date(c.created_at).toLocaleString()}>{getTimeAgo(c.created_at)}</span>
                       </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔥 MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ESTILO WINDOWS 🔥 */}
      {contentToRemove && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setContentToRemove(null)}>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-sm bg-card border border-destructive/40 rounded-xl p-5 shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-scale-in flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 shrink-0">
              <h3 className="font-pixel text-[11px] text-destructive flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> ELIMINAR PUBLICACIÓN
              </h3>
              <button onClick={() => setContentToRemove(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 text-center">
              <p className="text-sm font-body text-muted-foreground">
                ¿Seguro que quieres eliminar esta publicación de tu perfil?
              </p>
              <p className="text-[10px] font-body text-destructive/80 mt-2 uppercase tracking-wide">
                Esta acción es irreversible.
              </p>
            </div>

            {/* BOTONES IGUALES, CENTRADOS Y A TODO ANCHO */}
            <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-white/10 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setContentToRemove(null)} 
                className="w-full text-xs font-body border-white/10 hover:bg-white/5 h-10"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmRemoveContent} 
                disabled={isRemoving} 
                className="w-full text-xs font-pixel shadow-[0_0_15px_rgba(220,38,38,0.3)] h-10 tracking-tighter"
              >
                {isRemoving ? "Eliminando..." : "Sí, Eliminar"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}