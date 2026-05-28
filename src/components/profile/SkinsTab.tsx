import { useState, useEffect } from "react";
import { Palette, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_SKINS, SkinTheme } from "@/lib/skinThemes";

interface SkinsTabProps {
  userId: string;
}

export default function SkinsTab({ userId }: SkinsTabProps) {
  const { toast } = useToast();
  const [userSkins, setUserSkins] = useState<any[]>([]);
  const [activeSkins, setActiveSkins] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkins = async () => {
      try {
        console.log('🔍 Cargando skins para usuario:', userId);
        
        // Obtener skins en inventario del usuario
        const { data: inventory } = await supabase
          .from('user_inventory')
          .select('*')
          .eq('user_id', userId)
          .in('item_slug', Object.keys(ALL_SKINS));

        if (inventory) {
          console.log('📦 Inventario de skins:', inventory.length);
          setUserSkins(inventory);
        }

        // Obtener skins activas
        const { data: active, error: activeError } = await supabase
          .from('user_active_skins')
          .select('skin_type, skin_slug')
          .eq('user_id', userId);

        console.log('📊 Skins activas del usuario:', { active, error: activeError?.message });

        if (activeError && activeError.message.includes('relation')) {
          console.warn('⚠️ Tabla user_active_skins no existe o no es accesible');
        }

        if (active && active.length > 0) {
          const activeMap: Record<string, string> = {};
          active.forEach(s => {
            activeMap[s.skin_type] = s.skin_slug;
          });
          setActiveSkins(activeMap);
        } else if (!activeError) {
          // Sin skins activas y sin error - intentar activar demoniaco para testing
          console.log('🔧 Sin skins activas. Activando demoniaco automáticamente...');
          const { error: insertError } = await supabase
            .from('user_active_skins')
            .insert({
              user_id: userId,
              skin_type: 'launcher',
              skin_slug: 'demoniaco',
            });
          
          if (insertError) {
            console.error('❌ Error al insertar skin:', insertError);
          } else {
            console.log('✅ Demoniaco activado automáticamente');
            setActiveSkins({ launcher: 'demoniaco' });
          }
        }
      } catch (err) {
        console.error('❌ Error fetching skins:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSkins();
  }, [userId]);

  const handleActivateSkin = async (skinSlug: string, skinType: string = 'launcher') => {
    try {
      console.log(`🎨 Activando skin: ${skinSlug} (tipo: ${skinType})`);
      
      // Verificar si ya existe una skin activa de este tipo
      const { data: existing, error: checkError } = await supabase
        .from('user_active_skins')
        .select('id')
        .eq('user_id', userId)
        .eq('skin_type', skinType)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing skin:', checkError);
        throw checkError;
      }

      if (existing) {
        console.log(`📝 Actualizando skin existente: ${existing.id}`);
        // Actualizar
        const { error: updateError } = await supabase
          .from('user_active_skins')
          .update({ skin_slug: skinSlug })
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
      } else {
        console.log(`➕ Insertando nueva skin`);
        // Insertar
        const { error: insertError } = await supabase
          .from('user_active_skins')
          .insert({
            user_id: userId,
            skin_type: skinType,
            skin_slug: skinSlug,
          });
        
        if (insertError) throw insertError;
      }

      setActiveSkins(prev => ({
        ...prev,
        [skinType]: skinSlug,
      }));

      console.log(`✅ Skin activada correctamente: ${skinSlug}`);

      toast({
        title: "✅ Skin Activada",
        description: `La skin "${(ALL_SKINS as any)[skinSlug]?.name || skinSlug}" está activa`,
      });
    } catch (err: any) {
      console.error('❌ Error activating skin:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudo activar la skin",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateSkin = async (skinType: string) => {
    try {
      await supabase
        .from('user_active_skins')
        .delete()
        .eq('user_id', userId)
        .eq('skin_type', skinType);

      setActiveSkins(prev => {
        const updated = { ...prev };
        delete updated[skinType];
        return updated;
      });

      toast({
        title: "✅ Skin Desactivada",
        description: "Volviste al diseño original",
      });
    } catch (err) {
      console.error('Error deactivating skin:', err);
      toast({
        title: "Error",
        description: "No se pudo desactivar la skin",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando skins...</div>;
  }

  const launcherSkins = userSkins.filter(s => 
    (ALL_SKINS as any)[s.item_slug]?.type === 'launcher'
  );

  const agarioSkins = userSkins.filter(s => 
    (ALL_SKINS as any)[s.item_slug]?.type === 'agario'
  );

  return (
    <div className="space-y-6">
      {/* Launcher Skins */}
      {launcherSkins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-pixel text-neon-cyan">SKINS DE LAUNCHER</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {launcherSkins.map(skin => {
              const theme = (ALL_SKINS as any)[skin.item_slug] as SkinTheme;
              const isActive = activeSkins['launcher'] === skin.item_slug;

              return (
                <div
                  key={skin.id}
                  className={cn(
                    "p-4 rounded border-2 transition-all",
                    isActive
                      ? "border-neon-cyan bg-neon-cyan/10"
                      : "border-border hover:border-neon-cyan/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-pixel text-sm text-foreground">{theme.name}</h4>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-neon-cyan" />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="h-8 rounded" style={{ backgroundColor: theme.colors.primary }} />
                    <div className="h-8 rounded" style={{ backgroundColor: theme.colors.secondary }} />
                    <div className="h-8 rounded" style={{ backgroundColor: theme.colors.accent }} />
                  </div>

                  <div className="flex gap-2">
                    {isActive ? (
                      <Button
                        onClick={() => handleDeactivateSkin('launcher')}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        DESACTIVAR
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleActivateSkin(skin.item_slug, 'launcher')}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        ACTIVAR
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agario Skins */}
      {agarioSkins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-neon-green" />
            <h3 className="font-pixel text-neon-green">SKINS DE AGARIO</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agarioSkins.map(skin => {
              const theme = (ALL_SKINS as any)[skin.item_slug] as SkinTheme;
              const isActive = activeSkins['agario'] === skin.item_slug;

              return (
                <div
                  key={skin.id}
                  className={cn(
                    "p-4 rounded border-2 transition-all",
                    isActive
                      ? "border-neon-green bg-neon-green/10"
                      : "border-border hover:border-neon-green/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-pixel text-sm text-foreground">{theme.name}</h4>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-neon-green" />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="h-8 rounded" style={{ backgroundColor: theme.colors.primary }} />
                    <div className="h-8 rounded" style={{ backgroundColor: theme.colors.secondary }} />
                    <div className="h-8 rounded" style={{ backgroundColor: theme.colors.accent }} />
                  </div>

                  <div className="flex gap-2">
                    {isActive ? (
                      <Button
                        onClick={() => handleDeactivateSkin('agario')}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        DESACTIVAR
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleActivateSkin(skin.item_slug, 'agario')}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        ACTIVAR
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {userSkins.length === 0 && (
        <div className="text-center py-8">
          <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">No tienes skins aún. ¡Ve a la tienda y compra una!</p>
        </div>
      )}
    </div>
  );
}
