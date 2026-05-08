import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CloudUpload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function DriveSyncButton({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth(); // Necesitamos saber quién es el usuario actual
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setIsGoogleLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handleSync = () => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión primero.', variant: 'destructive' });
      return;
    }

    const google = (window as any).google;
    if (!isGoogleLoaded || !google) return;

    setIsSyncing(true);

    const client = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          setIsSyncing(false);
          toast({ title: 'Permiso denegado', description: 'No se pudo conectar con Google.', variant: 'destructive' });
          return;
        }
        await fetchAndSaveRoms(tokenResponse.access_token);
      },
    });

    client.requestAccessToken();
  };

  const getConsoleType = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['smc', 'sfc'].includes(ext || '')) return 'Super Nintendo';
    if (['nes'].includes(ext || '')) return 'Nintendo Entertainment System';
    if (['gba'].includes(ext || '')) return 'Game Boy Advance';
    if (['z64', 'n64', 'v64'].includes(ext || '')) return 'Nintendo 64';
    if (['bin', 'iso', 'cue'].includes(ext || '')) return 'PlayStation 1';
    return 'Arcade';
  };

  const fetchAndSaveRoms = async (token: string) => {
    try {
      // Buscamos extensiones específicas de emuladores
     // Buscamos extensiones y le decimos EXPLÍCITAMENTE a Google que ignore las carpetas
      const query = "mimeType != 'application/vnd.google-apps.folder' and (name contains '.sfc' or name contains '.smc' or name contains '.nes' or name contains '.gba' or name contains '.z64' or name contains '.n64' or name contains '.bin' or name contains '.iso')";
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        toast({ title: 'Detectando juegos...', description: `Encontramos ${data.files.length} juegos. Guardando en tu biblioteca...` });
        
        // Formateamos los datos para guardarlos en Supabase
        const gamesToSave = data.files.map((file: any) => ({
          user_id: user?.id,
          drive_file_id: file.id,
          file_name: file.name,
          console_type: getConsoleType(file.name)
        }));

// Upsert: Inserta los juegos nuevos, ignora los que ya estaban guardados
        const { error } = await supabase
          .from('user_drive_games' as any)
          .upsert(gamesToSave, { onConflict: 'user_id,drive_file_id' } as any);

        if (error) throw error;

        toast({ title: '¡Sincronización Completa!', description: 'Tus juegos ya están en tu biblioteca.' });
        
        // Si la página de la biblioteca nos pasó una función para recargarse, la llamamos
        if (onSyncComplete) onSyncComplete();

      } else {
        toast({ title: 'Carpeta Vacía', description: 'No se encontraron juegos compatibles en tu Google Drive.' });
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error de guardado', description: 'Hubo un problema guardando tus juegos.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isSyncing || !isGoogleLoaded} 
      className="bg-[#4285F4] hover:bg-[#3367D6] text-white font-pixel text-[10px]"
    >
      {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
      {isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR JUEGOS DE DRIVE'}
    </Button>
  );
}