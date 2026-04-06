import { useState, useEffect } from "react";
import { Instagram, Youtube, Music2, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const membershipVideoLimits: Record<string, number> = {
  novato: 0,
  entusiasta: 3,
  coleccionista: 10,
  "leyenda arcade": 30,
  "creador verificado": 100,
};

interface UserSocial {
  display_name: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  membership_tier: string;
  avatar_url: string | null;
}

export default function SocialReelsPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserSocial[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, instagram_url, youtube_url, tiktok_url, membership_tier, avatar_url")
        .or("instagram_url.neq.,youtube_url.neq.,tiktok_url.neq.")
        .limit(20);
      if (data) setUsers(data as unknown as UserSocial[]);
    };
    fetchUsers();
  }, []);

  const tier = profile?.membership_tier || "novato";
  const videoLimit = membershipVideoLimits[tier] || 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> REELS & VIDEOS
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Linkea tu Instagram, YouTube o TikTok para mostrar tu contenido a la comunidad
        </p>
      </div>

      {/* Link your accounts CTA */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-cyan mb-2">CONECTA TUS REDES</h3>
        <p className="text-xs text-muted-foreground font-body mb-3">
          Vincula tus cuentas desde <Link to="/configuracion" className="text-primary hover:text-primary/80">Configuración</Link> para aparecer aquí.
          La cantidad de contenido visible depende de tu membresía ({videoLimit} posts para plan {tier.toUpperCase()}).
        </p>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
            <Instagram className="w-3 h-3 text-neon-magenta" /> Instagram
          </div>
          <div className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
            <Youtube className="w-3 h-3 text-destructive" /> YouTube
          </div>
          <div className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
            <Music2 className="w-3 h-3 text-foreground" /> TikTok
          </div>
        </div>
      </div>

      {/* Users with linked accounts */}
      <div className="space-y-2">
        <h3 className="font-pixel text-[10px] text-muted-foreground">CREADORES DE LA COMUNIDAD</h3>
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body bg-card border border-border rounded p-4">
            Aún nadie ha vinculado sus redes. ¡Sé el primero!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {users.map((u) => (
              <div key={u.display_name} className="bg-card border border-border rounded p-3 flex items-center gap-3 hover:bg-muted/30 transition-all duration-200">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body text-foreground font-medium truncate">{u.display_name}</p>
                  <p className="text-[10px] text-neon-yellow font-body">{u.membership_tier.toUpperCase()}</p>
                </div>
                <div className="flex gap-1.5">
                  {u.instagram_url && (
                    <a href={u.instagram_url} target="_blank" rel="noopener noreferrer" className="text-neon-magenta hover:opacity-80 transition-opacity">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {u.youtube_url && (
                    <a href={u.youtube_url} target="_blank" rel="noopener noreferrer" className="text-destructive hover:opacity-80 transition-opacity">
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {u.tiktok_url && (
                    <a href={u.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:opacity-80 transition-opacity">
                      <Music2 className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
