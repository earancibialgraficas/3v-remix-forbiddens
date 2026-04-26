import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SocialContentTab({ profile, user, onEditNetworks, limits, isStaff }: any) {
  const { toast } = useToast();
  const [contents, setContents] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchContents = async () => {
    const { data } = await supabase
      .from("social_content")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      
    if (data) setContents(data);
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
    } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
      platform = "facebook";
      contentType = (url.includes("/video") || url.includes("watch")) ? "video" : "post";
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

  return (
    <div className="space-y-3 animate-in fade-in">
      <div className="bg-card border rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] opacity-60 mb-3 uppercase font-pixel tracking-tighter">
          Perfiles de Redes Sociales
        </h3>
        <Button variant="outline" onClick={onEditNetworks} className="w-full text-xs mb-2">
          Editar Vínculos de Perfil
        </Button>
      </div>

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
          className="w-full text-xs bg-neon-cyan text-black hover:bg-neon-cyan/80"
        >
          {reachedLimit ? "Límite Alcanzado" : adding ? "Publicando..." : "Publicar en el Hub"}
        </Button>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-pixel text-[10px] opacity-60 mb-2 uppercase text-center mt-4">
          Tu Contenido Publicado
        </h3>
        {contents.length === 0 ? (
           <p className="text-xs text-muted-foreground text-center py-4 font-body opacity-60">
             Aún no has publicado nada
           </p>
        ) : (
          contents.map(c => (
            <div key={c.id} className="p-2 bg-muted/30 rounded text-xs font-body border border-border/20 flex justify-between items-center group gap-2">
               <div className="flex flex-col flex-1 min-w-0">
                 <span className="truncate">{c.title || c.content_url}</span>
                 <span className="text-[9px] text-muted-foreground uppercase opacity-70">
                   {c.platform} • {c.content_type}
                 </span>
               </div>
               <button 
                 onClick={async () => { 
                   if (!confirm("¿Eliminar esta publicación?")) return;
                   await supabase.from("social_content").delete().eq("id", c.id); 
                   fetchContents(); 
                 }} 
                 className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
               >
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}