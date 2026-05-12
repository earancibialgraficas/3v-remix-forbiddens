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
  const [linkedCount, setLinkedCount] = useState(0);
  const MAX_RECOMMENDED = 200;

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
      setLinkedCount(count || 0);
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
      // 🔒 Antes de borrar: respaldamos los nombres y portadas personalizadas por file_name
      // para que cuando el usuario vuelva a vincular Drive, recupere su estética.
      const { data: existing } = await supabase
        .from('user_drive_games' as any)
        .select('file_name, custom_name, custom_cover_url')
        .eq('user_id', user.id);

      const toBackup = (existing || [])
        .filter((g: any) => g.custom_name || g.custom_cover_url)
        .map((g: any) => ({
          user_id: user.id,
          file_name: g.file_name,
          custom_name: g.custom_name,
          custom_cover_url: g.custom_cover_url,
          updated_at: new Date().toISOString(),
        }));

      if (toBackup.length > 0) {
        await supabase
          .from('user_game_covers' as any)
          .upsert(toBackup, { onConflict: 'user_id,file_name' });
      }

      await supabase.from('user_drive_games' as any).delete().eq('user_id', user.id);
      sessionStorage.removeItem('drive_access_token');
      sessionStorage.removeItem('drive_token_expiry');
      localStorage.removeItem('drive_access_token');
      localStorage.removeItem('drive_token_expiry');
      localStorage.removeItem('drive_linked_until');
      
      setIsLinked(false);
      toast({ title: 'Cuenta desvinculada', description: 'Tus portadas y nombres personalizados se guardaron para la próxima vez.' });
      
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
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          setIsSyncing(false);
          toast({ title: 'Permiso denegado', description: 'No se pudo conectar con Google.', variant: 'destructive' });
          return;
        }
        
        const ttlMs = (tokenResponse.expires_in ? tokenResponse.expires_in * 1000 : 55 * 60 * 1000) - 60_000;
        localStorage.setItem('drive_access_token', tokenResponse.access_token);
        localStorage.setItem('drive_token_expiry', (Date.now() + ttlMs).toString());
        localStorage.setItem('drive_linked_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
        sessionStorage.setItem('drive_access_token', tokenResponse.access_token);
        sessionStorage.setItem('drive_token_expiry', (Date.now() + ttlMs).toString());

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
    return <Button disabled variant="outline" className="h-9 text-[10px]"><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Verificando...</Button>
  }

  const pct = Math.min(100, (linkedCount / MAX_RECOMMENDED) * 100);

  // Botón principal (cambia entre Vincular / Desvincular según estado)
  const mainButton = isLinked ? (
    <button
      onClick={handleDisconnect}
      disabled={isSyncing}
      className="group relative w-full sm:w-auto overflow-hidden rounded-lg border border-neon-green/40 bg-gradient-to-br from-neon-green/15 via-card to-neon-cyan/5 p-3 text-left transition-all hover:border-neon-green hover:shadow-[0_0_24px_-6px_hsl(var(--neon-green))] disabled:opacity-50 shrink-0"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <div className="relative flex items-center gap-3">
        <div className="p-2 rounded bg-neon-green/15 border border-neon-green/30 shrink-0">
          {isSyncing ? <Loader2 className="w-4 h-4 text-neon-green animate-spin" /> : <CloudOff className="w-4 h-4 text-neon-green" />}
        </div>
        <div className="min-w-0">
          <p className="font-pixel text-[10px] text-neon-green uppercase leading-tight">
            {isSyncing ? 'Procesando...' : 'Desvincular Google Drive'}
          </p>
          <p className="text-[10px] text-muted-foreground font-body mt-0.5">
            Drive conectado · click para desconectar
          </p>
        </div>
      </div>
    </button>
  ) : (
    <button
      onClick={handleSync}
      disabled={isSyncing || !isGoogleLoaded}
      className="group relative w-full sm:w-auto overflow-hidden rounded-lg border border-neon-cyan/40 bg-gradient-to-br from-[#4285F4]/20 via-card to-neon-magenta/10 p-3 text-left transition-all hover:border-neon-cyan hover:shadow-[0_0_24px_-6px_hsl(var(--neon-cyan))] disabled:opacity-50 shrink-0"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <div className="relative flex items-center gap-3">
        <div className="p-2 rounded bg-[#4285F4]/20 border border-[#4285F4]/40 shrink-0">
          {isSyncing ? <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" /> : <CloudUpload className="w-4 h-4 text-neon-cyan" />}
        </div>
        <div className="min-w-0">
          <p className="font-pixel text-[10px] text-neon-cyan uppercase leading-tight">
            {isSyncing ? 'Sincronizando...' : 'Vincular Google Drive'}
          </p>
          <p className="text-[10px] text-muted-foreground font-body mt-0.5">
            Trae tus ROMs desde la nube a tu biblioteca arcade
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full">
      {mainButton}
      {/* Barrita: solo cuando está vinculado */}
      {isLinked && (
        <div className="relative flex-1 min-w-0 rounded-lg border border-neon-green/30 bg-gradient-to-br from-neon-green/5 via-card to-neon-cyan/5 p-3 shadow-[0_0_20px_-10px_hsl(var(--neon-green))] overflow-hidden flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="font-pixel text-[9px] text-neon-green uppercase leading-tight truncate">ROMs vinculadas</p>
            <p className="text-[10px] text-muted-foreground font-body whitespace-nowrap">
              <span className="text-foreground font-bold">{linkedCount}</span> / {MAX_RECOMMENDED}
            </p>
          </div>
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-magenta transition-all duration-700"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}