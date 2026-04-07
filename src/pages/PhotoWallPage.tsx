import { useState, useEffect } from "react";
import { Camera, Heart, ThumbsDown, Flag, MessageSquare, Upload, Image, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const membershipPhotoLimits: Record<string, number> = {
  novato: 0,
  entusiasta: 5,
  coleccionista: 15,
  "leyenda arcade": 50,
  "creador verificado": 100,
};

export default function PhotoWallPage() {
  const { user, profile } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const [photos, setPhotos] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userPhotoCount, setUserPhotoCount] = useState(0);
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");

  const tier = profile?.membership_tier || "novato";
  const photoLimit = membershipPhotoLimits[tier] || 0;

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .order("likes", { ascending: false })
      .limit(50);
    if (data) setPhotos(data);
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
    if (userPhotoCount >= photoLimit) {
      toast({ title: "Límite alcanzado", description: `Tu plan ${tier} permite ${photoLimit} fotos. Actualiza tu membresía.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const { error } = await supabase.from("photos").insert({
      user_id: user.id,
      image_url: imageUrl.trim(),
      caption: caption.trim(),
    } as any);
    setUploading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCaption("");
      setImageUrl("");
      setShowUpload(false);
      setUserPhotoCount((prev) => prev + 1);
      fetchPhotos();
      toast({ title: "Foto publicada" });
    }
  };

  const handleLike = async (photoId: string) => {
    // Optimistic update
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    await supabase.from("photos").update({ likes: (photos.find(p => p.id === photoId)?.likes || 0) + 1 } as any).eq("id", photoId);
  };

  const handleReport = async (photoId: string, userId: string) => {
    if (!user) return;
    await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: userId,
      reason: "Foto inapropiada",
    } as any);
    toast({ title: "Reporte enviado" });
  };

  const displayPhotos = sourceTab === "friends"
    ? photos.filter(p => friendIds.includes(p.user_id))
    : photos;

  // Split into "top" (first 6) for mosaic and rest for grid
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

      {/* Source tabs */}
      {user && (
        <div className="flex gap-1 bg-card border border-border rounded p-1">
          <button onClick={() => setSourceTab("all")}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all",
              sourceTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Globe className="w-3 h-3" /> Todos
          </button>
          <button onClick={() => setSourceTab("friends")}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all",
              sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Users className="w-3 h-3" /> Amigos
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-body">
          {user ? `${userPhotoCount}/${photoLimit} fotos subidas (Plan ${tier.toUpperCase()})` : "Inicia sesión para subir fotos"}
        </p>
        {user && photoLimit > 0 && (
          <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground" onClick={() => setShowUpload(!showUpload)}>
            <Upload className="w-3 h-3 mr-1" /> Subir Foto
          </Button>
        )}
      </div>

      {showUpload && (
        <div className="bg-card border border-neon-orange/30 rounded p-4 space-y-3 animate-fade-in">
          <Input placeholder="URL de la imagen" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-8 bg-muted text-xs font-body" />
          <Textarea placeholder="Descripción (opcional)..." value={caption} onChange={(e) => setCaption(e.target.value)} className="bg-muted text-xs font-body min-h-[60px]" />
          <Button size="sm" onClick={handleUpload} disabled={uploading || !imageUrl.trim()} className="text-xs">
            {uploading ? "Subiendo..." : "Publicar"}
          </Button>
        </div>
      )}

      {/* Mosaic carousel - top photos */}
      {topPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {topPhotos.map((photo, i) => (
            <div
              key={photo.id}
              className={cn(
                "relative group rounded overflow-hidden bg-muted border border-border transition-all duration-300 hover:scale-[1.02]",
                i === 0 && "col-span-2 row-span-2"
              )}
            >
              <img src={photo.image_url} alt={photo.caption || "Foto"} className="w-full h-full object-cover min-h-[120px]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                <div className="flex items-center gap-2 text-[10px] font-body">
                  <button onClick={() => handleLike(photo.id)} className="flex items-center gap-0.5 text-neon-green hover:text-neon-green/80 transition-colors">
                    <Heart className="w-3 h-3" /> {photo.likes}
                  </button>
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <ThumbsDown className="w-3 h-3" /> {photo.dislikes}
                  </span>
                  {user && (
                    <button onClick={() => handleReport(photo.id, photo.user_id)} className="text-muted-foreground hover:text-destructive transition-colors ml-auto">
                      <Flag className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {photo.caption && (
                <p className="absolute bottom-0 left-0 right-0 bg-background/70 text-[9px] text-foreground font-body p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rest of photos */}
      {restPhotos.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
          {restPhotos.map((photo) => (
            <div key={photo.id} className="relative group rounded overflow-hidden bg-muted aspect-square border border-border transition-all duration-200 hover:border-neon-orange/50">
              <img src={photo.image_url} alt={photo.caption || "Foto"} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => handleLike(photo.id)} className="text-neon-green text-[10px] flex items-center gap-0.5">
                  <Heart className="w-3 h-3" /> {photo.likes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {displayPhotos.length === 0 && (
        <div className="bg-card border border-border rounded p-8 text-center">
          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground font-body">
            {sourceTab === "friends" ? "Tus amigos aún no han subido fotos" : "Aún no hay fotos en la galería"}
          </p>
          <p className="text-[10px] text-muted-foreground font-body mt-1">Sé el primero en compartir una imagen</p>
        </div>
      )}
    </div>
  );
}
