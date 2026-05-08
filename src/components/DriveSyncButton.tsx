import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CloudUpload, CloudOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function DriveSyncButton({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setIsGoogleLoaded(true);
    document.body.appendChild(script);

    checkLinkedState();
  }, [user]);

  const checkLinkedState = async () => {
    if (!user) return;
    setIsLoadingState(true);
    try {
      const { count } = await supabase
        .from('user_drive_games' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setIsLinked((count && count > 0) ? true : false);
    } catch (error) {
      console.error("Error verificando estado de Drive", error);
    } finally {
      setIsLoadingState(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await supabase.from('user_drive_games' as any).delete().eq('user_id', user.id);
      sessionStorage.removeItem('drive_access_token');
      sessionStorage.removeItem('drive_token_expiry');
      
      setIsLinked(false);
      toast({ title: 'Cuenta desvinculada', description: 'Se han borrado los juegos de tu biblioteca.' });
      
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo desvincular la cuenta.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const getConsoleType = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['smc', 'sfc'].includes(ext || '')) return 'Super Nintendo';
    if (['nes'].includes(ext || '')) return 'Nintendo Entertainment System';
    if (['gba'].includes(ext || '')) return 'Game Boy Advance';
    if (['z64', 'n64', 'v64'].includes(ext || '')) return 'Nintendo 64';
    // Se agregan extensiones de PS1 más modernas como chd y cue
    if (['bin', 'iso', 'cue', 'chd'].includes(ext || '')) return 'PlayStation 1';
    return 'Arcade';
  };

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
        
        sessionStorage.setItem('drive_access_token', tokenResponse.access_token);
        sessionStorage.setItem('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString());

        await fetchAndSaveRoms(tokenResponse.access_token);
      },
    });

    client.requestAccessToken();
  };

  const fetchAndSaveRoms = async (token: string) => {
    try {
      // 1. BUSCAMOS LA CARPETA "RetroRoms"
      const folderQuery = "mimeType = 'application/vnd.google-apps.folder' and name = 'RetroRoms' and trashed = false";
      const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id, name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const folderData = await folderRes.json();
      
      if (!folderData.files || folderData.files.length === 0) {
        toast({ 
          title: 'Carpeta no encontrada 📁', 
          description: 'Crea una carpeta llamada "RetroRoms" en tu Drive y coloca tus juegos dentro para sincronizarlos.', 
          variant: 'destructive',
          duration: 7000
        });
        setIsSyncing(false);
        return;
      }

      const folderId = folderData.files[0].id;

      // 2. BUSCAMOS JUEGOS SOLO DENTRO DE ESA CARPETA
      const filesQuery = `'${folderId}' in parents and trashed = false`;
      const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(filesQuery)}&fields=files(id, name)&pageSize=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await filesRes.json();
      
      if (data.files && data.files.length > 0) {
        // Filtramos por si el usuario metió un PDF por error en la carpeta
        const validFiles = data.files.filter((file: any) => {
          const name = file.name.toLowerCase();
          return name.endsWith('.sfc') || name.endsWith('.smc') || name.endsWith('.nes') || 
                 name.endsWith('.gba') || name.endsWith('.z64') || name.endsWith('.n64') ||
                 name.endsWith('.bin') || name.endsWith('.iso') || name.endsWith('.cue') || name.endsWith('.chd');
        });

        if (validFiles.length === 0) {
          toast({ title: 'Carpeta vacía', description: 'Tu carpeta RetroRoms no tiene juegos compatibles.' });
          setIsSyncing(false);
          return;
        }

        toast({ title: 'Detectando juegos...', description: `Guardando ${validFiles.length} juegos de tu carpeta RetroRoms...` });
        
        const gamesToSave = validFiles.map((file: any) => ({
          user_id: user?.id,
          drive_file_id: file.id,
          file_name: file.name,
          console_type: getConsoleType(file.name)
        }));

        const { error } = await supabase
          .from('user_drive_games' as any)
          .upsert(gamesToSave, { onConflict: 'user_id,drive_file_id' });

        if (error) throw error;

        setIsLinked(true);
        toast({ title: '¡Sincronización Completa!', description: 'Tus juegos ya están en tu biblioteca.' });
        if (onSyncComplete) onSyncComplete();

      } else {
        toast({ title: 'Carpeta Vacía', description: 'Tu carpeta "RetroRoms" está vacía.' });
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error de red', description: 'Hubo un problema leyendo tu Drive.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoadingState) {
    return <Button disabled variant="outline" className="h-8 text-[10px]"><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Verificando...</Button>
  }

  if (isLinked) {
    return (
      <Button onClick={handleDisconnect} disabled={isSyncing} variant="destructive" className="font-pixel text-[10px] h-8">
        {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudOff className="w-4 h-4 mr-2" />}
        {isSyncing ? 'DESVINCULANDO...' : 'DESVINCULAR DRIVE'}
      </Button>
    );
  }

  return (
    <Button onClick={handleSync} disabled={isSyncing || !isGoogleLoaded} className="bg-[#4285F4] hover:bg-[#3367D6] text-white font-pixel text-[10px] h-8">
      {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
      {isSyncing ? 'SINCRONIZANDO...' : 'VINCULAR DRIVE'}
    </Button>
  );
}