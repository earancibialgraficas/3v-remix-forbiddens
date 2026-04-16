import { useState, useEffect } from "react";
import { Camera, Heart, ThumbsDown, ThumbsUp, Flag, Image, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReportModal from "@/components/ReportModal";

const membershipPhotoLimits: Record<string, number> = {
  novato: 15,
  entusiasta: 30,
  coleccionista: 50,
  "leyenda arcade": 100,
  "creador verificado": 200,
};

export default function PhotoWallPage() {
  const { user, profile, isStaff } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const [photos, setPhotos] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userPhotoCount, setUserPhotoCount] = useState(0);
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [reportTarget, setReportTarget] = useState<{ userId: string; name: string } | null>(null);

  const tier = profile?.membership_tier || "novato";
  const photoLimit = isStaff ? Infinity : (membershipPhotoLimits[tier] || 15);

  const fetchPhotos = async () => {
    const { data } = await supabase.from("photos").select("*").order("likes", { ascending: false }).limit(50);
    if (data) setPhotos(data);
    // Fetch user reactions
    if (user && data && data.length > 0) {
      const ids = data.map((p: any) => p.id);
      const { data: reactions } = await supabase.from("social_reactions").select("target_id, reaction_type").eq("user_id", user.id).eq("target_type", "photo").in("target_id", ids);
      const rMap: Record<string, string> = {};
      reactions?.forEach((r: any) => { rMap[r.target_id] = r.reaction_type; });
      setUserReactions(rMap);
    }
  };

  useEffect(() => {
    fetchPhotos();
    if (user) {
      supabase.from("photos").select("id", { count: "exact" }).eq("user_id", user.id)
        .then(({ count }) => setUserPhotoCount(count || 0));
    }
  }, [user]);

  const handleUpload = async () => {
    if (!user || !imageUrl.trim()) return;
    if (!isStaff && userPhotoCount >= photoLimit) {
      toast({ title: "Límite alcanzado", description: `Tu plan ${tier} permite ${photoLimit} fotos.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const { error } = await supabase.from("photos").insert({ user_id: user.id, image_url: imageUrl.trim(), caption: caption.trim() } as any);
    setUploading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setCaption(""); setImageUrl(""); setShowUpload(false); setUserPhotoCount(p => p + 1); fetchPhotos(); toast({ title: "Foto publicada" }); }
  };

  const handleReaction = async (photoId: string, type: string) => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    const { data, error } = await supabase.rpc("toggle_social_reaction", {
      p_target_type: "photo", p_target_id: photoId, p_user_id: user.id, p_reaction_type: type,
    });
    if (!error && data) {
      const r = data as any;
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, likes: r.likes, dislikes: r.dislikes } : p));
      setUserReactions(prev => ({ ...prev, [photoId]: r.user_reaction }));
    }
  };

  const displayPhotos = sourceTab === "friends" ? photos.filter(p => friendIds.includes(p.user_id)) : photos;
  const topPhotos = displayPhotos.slice(0, 6);
  const restPhotos = displayPhotos.slice(6);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Camera className="w-4 h-4" /> MURO FOTOGRÁFICO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Galería de la comunidad — Las fotos más populares aparecen primero</p>
      </div>

      {user && (
        <div className="flex gap-1 bg-card border border-border rounded p-1">
          <button onClick={() => setSourceTab("all")} className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Globe className="w-3 h-3" /> Todos
          </button>
          <button onClick={() => setSourceTab("friends")} className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Users className="w-3 h-3" /> Amigos
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-body">
          {user ? `${userPhotoCount}/${photoLimit === Infinity ? "∞" : photoLimit} fotos (Plan ${isStaff ? "STAFF" : tier.toUpperCase()})` : "Inicia sesión para subir fotos"}
        </p>
        {user && (
          <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground" onClick={() => setShowUpload(!showUpload)}>
            Subir Foto
          </Button>
        )}
      </div>

      {showUpload && (
        <div className="bg-card border border-neon-orange/30 rounded p-4 space-y-3 animate-fade-in">
          <Input placeholder="URL de la imagen" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-8 bg-muted text-xs font-body" />
          <Textarea placeholder="Descripción (opcional)..." value={caption} onChange={e => setCaption(e.target.value)} className="bg-muted text-xs font-body min-h-[60px]" />
          <Button size="sm" onClick={handleUpload} disabled={uploading || !imageUrl.trim()} className="text-xs">{uploading ? "Subiendo..." : "Publicar"}</Button>
        </div>
      )}

      {topPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {topPhotos.map((photo, i) => (
            <div key={photo.id} className={cn("relative group rounded overflow-hidden bg-muted border border-border transition-all duration-300 hover:scale-[1.02]", i === 0 && "col-span-2 row-span-2")}>
              <img src={photo.image_url} alt={photo.caption || "Foto"} className="w-full h-full object-cover min-h-[120px]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                <div className="flex items-center gap-2 text-[10px] font-body w-full">
                  <button onClick={() => handleReaction(photo.id, "like")} className={cn("flex items-center gap-0.5 transition-colors", userReactions[photo.id] === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}>
                    <ThumbsUp className="w-3 h-3" /> {photo.likes}
                  </button>
                  <button onClick={() => handleReaction(photo.id, "dislike")} className={cn("flex items-center gap-0.5 transition-colors", userReactions[photo.id] === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
                    <ThumbsDown className="w-3 h-3" /> {photo.dislikes}
                  </button>
                  {user && (
                    <button onClick={() => setReportTarget({ userId: photo.user_id, name: "usuario" })} className="text-muted-foreground hover:text-destructive transition-colors ml-auto">
                      <Flag className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {restPhotos.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
          {restPhotos.map(photo => (
            <div key={photo.id} className="relative group rounded overflow-hidden bg-muted aspect-square border border-border transition-all duration-200 hover:border-neon-orange/50">
              <img src={photo.image_url} alt={photo.caption || "Foto"} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => handleReaction(photo.id, "like")} className={cn("text-[10px] flex items-center gap-0.5", userReactions[photo.id] === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}>
                  <ThumbsUp className="w-3 h-3" /> {photo.likes}
                </button>
                <button onClick={() => handleReaction(photo.id, "dislike")} className={cn("text-[10px] flex items-center gap-0.5", userReactions[photo.id] === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
                  <ThumbsDown className="w-3 h-3" /> {photo.dislikes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {displayPhotos.length === 0 && (
        <div className="bg-card border border-border rounded p-8 text-center">
          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground font-body">{sourceTab === "friends" ? "Tus amigos aún no han subido fotos" : "Aún no hay fotos"}</p>
        </div>
      )}

      {reportTarget && <ReportModal reportedUserId={reportTarget.userId} reportedUserName={reportTarget.name} onClose={() => setReportTarget(null)} />}
    </div>
  );
}
