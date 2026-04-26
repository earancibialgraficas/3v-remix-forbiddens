import { useState } from "react";
import { Check, Upload, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";

interface AvatarSelectorProps {
  currentAvatarUrl?: string | null;
  onSelect: (url: string) => void;
}

// 🔥 ARREGLO EXPANDIDO A MÁS DE 60 AVATARES PARA EL STAFF 🔥
const PREDEFINED_AVATARS = [
  // Pixel Art (Novato)
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Milo",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Luna",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Buster",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Peanut",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Daisy",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Smokey",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Ginger",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Rocky",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Toby",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Lucky",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Patch",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Rex",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Buddy",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Coco",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Ruby",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Oscar",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Missy",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Bear",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Sam",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Zoe",
  
  // Adventurer (Entusiastas en adelante)
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Alexander",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Maya",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Arthur",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Diana",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Finn",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Isla",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Noah",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Ava",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Ethan",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Liam",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Emma",
  
  // Bottts (Coleccionistas en adelante)
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo2",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo3",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo5",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo6",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo7",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo8",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo9",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo10",

  // Avatares Míticos / Leyenda
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zeus",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Hades",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Poseidon",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ares",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Athena",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Apollo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Artemis",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Hermes",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Hera",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Demeter",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Dionysus",
];

export default function AvatarSelector({ currentAvatarUrl, onSelect }: AvatarSelectorProps) {
  const { user, profile, isMasterWeb, isAdmin, roles } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const userTier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const limits = isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[userTier];

  const visibleAvatars = PREDEFINED_AVATARS.slice(0, limits.maxAvatars);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!limits.canUploadAvatar) {
        toast({
          title: "Acceso denegado",
          description: "Tu membresía actual no permite subir avatares personalizados.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onSelect(publicUrl);
      toast({ title: "Avatar subido con éxito" });
    } catch (error: any) {
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <label 
            className={cn(
              "flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-full transition-all cursor-pointer overflow-hidden",
              limits.canUploadAvatar 
                ? "border-primary/50 hover:border-primary bg-muted/30" 
                : "border-muted bg-muted/10 cursor-not-allowed opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-[10px] font-pixel uppercase">Subir Propio</span>
                {!limits.canUploadAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                )}
              </>
            )}
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading || !limits.canUploadAvatar}
              accept="image/*"
            />
          </label>
        </div>
        {!limits.canUploadAvatar && (
          <p className="text-[9px] text-neon-orange font-pixel animate-pulse">
            Mejora tu plan para subir tu propio avatar
          </p>
        )}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {visibleAvatars.map((url, index) => (
          <button
            key={index}
            onClick={() => onSelect(url)}
            className={cn(
              "relative aspect-square rounded-lg border-2 transition-all hover:scale-105 overflow-hidden group",
              currentAvatarUrl === url ? "border-primary shadow-neon-sm" : "border-border/50 hover:border-primary/50"
            )}
          >
            <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
            {currentAvatarUrl === url && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
            )}
          </button>
        ))}
      </div>
      
      <p className="text-[9px] text-muted-foreground text-center font-body uppercase">
        Viendo {visibleAvatars.length} de {PREDEFINED_AVATARS.length} avatares disponibles para tu plan
      </p>
    </div>
  );
}