import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 25+ avatars per tier using free avatar APIs
const avatarSets: Record<string, string[]> = {
  novato: Array.from({ length: 25 }, (_, i) => `https://api.dicebear.com/9.x/pixel-art/svg?seed=novato${i}`),
  entusiasta: [
    ...Array.from({ length: 25 }, (_, i) => `https://api.dicebear.com/9.x/adventurer/svg?seed=entusiasta${i}`),
    ...Array.from({ length: 5 }, (_, i) => `https://api.dicebear.com/9.x/bottts/svg?seed=entusiasta-bot${i}`),
  ],
  coleccionista: [
    ...Array.from({ length: 25 }, (_, i) => `https://api.dicebear.com/9.x/avataaars/svg?seed=coleccionista${i}`),
    ...Array.from({ length: 5 }, (_, i) => `https://api.dicebear.com/9.x/fun-emoji/svg?seed=coleccionista-fun${i}`),
    // GIF-style animated avatars (static fallback)
    ...Array.from({ length: 5 }, (_, i) => `https://api.dicebear.com/9.x/thumbs/svg?seed=coleccionista-anim${i}`),
  ],
  "leyenda arcade": [
    ...Array.from({ length: 30 }, (_, i) => `https://api.dicebear.com/9.x/lorelei/svg?seed=leyenda${i}`),
    ...Array.from({ length: 10 }, (_, i) => `https://api.dicebear.com/9.x/notionists/svg?seed=leyenda-n${i}`),
    ...Array.from({ length: 5 }, (_, i) => `https://api.dicebear.com/9.x/open-peeps/svg?seed=leyenda-op${i}`),
  ],
};

// Staff get all + upload option
const staffAvatars = [
  ...Array.from({ length: 30 }, (_, i) => `https://api.dicebear.com/9.x/personas/svg?seed=staff${i}`),
  ...Array.from({ length: 20 }, (_, i) => `https://api.dicebear.com/9.x/big-smile/svg?seed=staff-bs${i}`),
];

interface AvatarSelectorProps {
  currentAvatar: string | null;
  membershipTier: string;
  isStaff: boolean;
  onSelect: (url: string) => void;
  onUpload?: (file: File) => void;
  onClose: () => void;
}

export default function AvatarSelector({ currentAvatar, membershipTier, isStaff, onSelect, onUpload, onClose }: AvatarSelectorProps) {
  const [selectedTab, setSelectedTab] = useState<string>(membershipTier);

  const tiers = isStaff
    ? [...Object.keys(avatarSets), "staff"]
    : Object.keys(avatarSets).slice(0, Object.keys(avatarSets).indexOf(membershipTier) + 1);

  const currentAvatars = selectedTab === "staff" ? staffAvatars : (avatarSets[selectedTab] || avatarSets.novato);

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-neon-cyan/30 rounded-lg p-5 max-w-lg w-full mx-4 animate-scale-in max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-pixel text-[10px] text-neon-cyan mb-3">SELECCIONAR AVATAR</h2>

        {/* Tier tabs */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {tiers.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTab(t)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-body transition-all",
                selectedTab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "staff" ? "⭐ Staff" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Staff upload */}
        {isStaff && selectedTab === "staff" && onUpload && (
          <div className="mb-3">
            <label className="flex items-center gap-2 p-2 border border-dashed border-border rounded cursor-pointer hover:bg-muted/30 transition-colors">
              <span className="text-[10px] font-body text-muted-foreground">📤 Subir imagen personalizada (max 500x500px, JPG/PNG/GIF)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
            </label>
          </div>
        )}

        {/* Avatar grid */}
        <div className="flex-1 overflow-y-auto retro-scrollbar">
          <div className="grid grid-cols-6 gap-2">
            {currentAvatars.map((url, i) => (
              <button
                key={i}
                onClick={() => onSelect(url)}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                  currentAvatar === url ? "border-neon-green shadow-lg shadow-neon-green/20" : "border-border hover:border-primary/50"
                )}
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                {currentAvatar === url && (
                  <div className="absolute inset-0 bg-neon-green/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-neon-green" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
