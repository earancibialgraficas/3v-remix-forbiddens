import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getSkinTheme, SKIN_SLUGS } from '@/lib/skinThemes';

/**
 * Componente de debug para probar la aplicación de skins
 * Se usa en desarrollo para cambiar skins fácilmente
 */
export function SkinDebugPanel() {
  const { user } = useAuth();
  const [currentSkin, setCurrentSkin] = useState<string>('default');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    const fetchCurrentSkin = async () => {
      const { data } = await supabase
        .from('user_active_skins')
        .select('skin_slug')
        .eq('user_id', user.id)
        .eq('skin_type', 'launcher')
        .single();

      if (data) {
        setCurrentSkin(data.skin_slug);
      }
    };

    fetchCurrentSkin();
  }, [user?.id]);

  const handleSkinChange = async (skinSlug: string) => {
    if (!user?.id) {
      setMessage('❌ No hay usuario logueado');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Verificar si existe registro
      const { data: existing } = await supabase
        .from('user_active_skins')
        .select('*')
        .eq('user_id', user.id)
        .eq('skin_type', 'launcher')
        .single();

      if (existing) {
        // Actualizar
        const { error } = await supabase
          .from('user_active_skins')
          .update({ skin_slug: skinSlug })
          .eq('user_id', user.id)
          .eq('skin_type', 'launcher');

        if (error) throw error;
      } else {
        // Insertar
        const { error } = await supabase
          .from('user_active_skins')
          .insert([
            {
              user_id: user.id,
              skin_type: 'launcher',
              skin_slug: skinSlug,
            },
          ]);

        if (error) throw error;
      }

      setCurrentSkin(skinSlug);
      setMessage(`✅ Skin cambiada a: ${getSkinTheme(skinSlug as any).name}`);
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black border border-red-500 p-4 rounded-lg z-50 max-w-xs">
      <h3 className="text-red-500 font-bold mb-2">🎨 SKIN DEBUG</h3>
      
      <div className="text-xs text-gray-400 mb-2">
        Usuario: {user.email}
      </div>

      <div className="text-xs text-gray-400 mb-3">
        Skin actual: <span className="text-red-400">{currentSkin}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {SKIN_SLUGS.map((slug) => (
          <Button
            key={slug}
            size="sm"
            variant={currentSkin === slug ? 'default' : 'outline'}
            onClick={() => handleSkinChange(slug)}
            disabled={loading}
            className="text-xs"
          >
            {slug}
          </Button>
        ))}
      </div>

      {message && <div className="text-xs text-yellow-400">{message}</div>}
    </div>
  );
}
