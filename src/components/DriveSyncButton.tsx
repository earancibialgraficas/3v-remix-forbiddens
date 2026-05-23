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

  // Normaliza nombre de carpeta (PSP, PS1, NES…) a console_type canónico
  const folderNameToConsole = (rawName: string): string | null => {
    const n = rawName.trim().toLowerCase().replace(/[\s_\-]/g, '');
    if (['psp', 'playstationportable'].includes(n)) return 'PlayStation Portable';
    if (['ps1', 'psx', 'playstation', 'playstation1'].includes(n)) return 'PlayStation 1';
    if (['n64', 'nintendo64'].includes(n)) return 'Nintendo 64';
    if (['snes', 'supernintendo', 'supernes'].includes(n)) return 'Super Nintendo';
    if (['nes', 'nintendoentertainmentsystem'].includes(n)) return 'Nintendo Entertainment System';
    if (['gba', 'gameboyadvance'].includes(n)) return 'Game Boy Advance';
    if (['arcade', 'mame', 'fbneo'].includes(n)) return 'Arcade';
    return null;
  };

  const getConsoleType = (fileName: string, parentHint?: string | null) => {
    if (parentHint) return parentHint;
    const ext = fileName.toLowerCase().split('.').pop();
    if (['smc', 'sfc'].includes(ext || '')) return 'Super Nintendo';
    if (['nes'].includes(ext || '')) return 'Nintendo Entertainment System';
    if (['gba'].includes(ext || '')) return 'Game Boy Advance';
    if (['z64', 'n64', 'v64'].includes(ext || '')) return 'Nintendo 64';
    // Extensiones EXCLUSIVAS de PSP
    if (['cso', 'pbp'].includes(ext || '')) return 'PlayStation Portable';
    // PS1 (bin/iso/cue/chd son ambiguas — se usa carpeta padre PSP/ vs PS1/ para diferenciar)
    if (['bin', 'iso', 'cue', 'chd'].includes(ext || '')) return 'PlayStation 1';
    return 'Arcade';
  };

  const handleSync = () => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión primero.', variant: 'destructive' });
      return;
    }

    const google = (window as any).google;
    if (!isGoogleLoaded || !google) {
      toast({ title: 'Google aún no cargó', description: 'Espera un momento e inténtalo de nuevo.', variant: 'destructive' });
      return;
    }

    // Aviso si estamos en un iframe (preview de Lovable) — el popup OAuth de Google
    // suele ser bloqueado o nunca dispara el callback dentro de un iframe cross-origin.
    if (window.self !== window.top) {
      toast({
        title: 'Abre la app en pestaña propia',
        description: 'La vinculación con Google Drive no funciona dentro del preview embebido. Abre la app publicada o en una pestaña nueva e intenta de nuevo.',
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }

    setIsSyncing(true);

    // Failsafe: si Google no responde en 90s, desbloqueamos el botón
    const safetyTimer = window.setTimeout(() => {
      console.warn('[DriveSync] safety timeout reached, resetting state');
      setIsSyncing(false);
      toast({ title: 'Tiempo agotado', description: 'No se recibió respuesta de Google. Intenta de nuevo.', variant: 'destructive' });
    }, 90_000);

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse: any) => {
          window.clearTimeout(safetyTimer);
          if (tokenResponse.error) {
            console.error('[DriveSync] token error', tokenResponse);
            setIsSyncing(false);
            toast({ title: 'Permiso denegado', description: tokenResponse.error_description || 'No se pudo conectar con Google.', variant: 'destructive' });
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
        error_callback: (err: any) => {
          window.clearTimeout(safetyTimer);
          console.error('[DriveSync] error_callback', err);
          setIsSyncing(false);
          const type = err?.type || 'unknown';
          const msg = type === 'popup_closed'
            ? 'Google cerró la ventana antes de entregar permisos. Si estás en el preview, abre la app en pestaña propia o publicada e inténtalo otra vez.'
            : type === 'popup_failed_to_open'
              ? 'El navegador bloqueó el popup de Google. Permite popups para este sitio e intenta de nuevo.'
              : (err?.message || 'No se pudo abrir Google.');
          toast({ title: 'Vinculación cancelada', description: msg, variant: 'destructive' });
        },
      });

      client.requestAccessToken({ prompt: 'consent select_account' });
    } catch (e: any) {
      window.clearTimeout(safetyTimer);
      console.error('[DriveSync] requestAccessToken threw', e);
      setIsSyncing(false);
      toast({ title: 'Error', description: e?.message || 'No se pudo iniciar el proceso.', variant: 'destructive' });
    }
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

      // 2a. Buscamos SUBCARPETAS dentro de RetroRoms (PSP/, PS1/, NES/, etc.)
      const subfoldersQuery = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const subfoldersRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(subfoldersQuery)}&fields=files(id,name)&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subfoldersData = await subfoldersRes.json();
      const subfolders: Array<{ id: string; name: string; console: string | null }> = (subfoldersData.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        console: folderNameToConsole(f.name),
      }));
      const parentToConsole = new Map<string, string>();
      subfolders.forEach((sf) => { if (sf.console) parentToConsole.set(sf.id, sf.console); });

      // 2b. Buscamos juegos en la carpeta raíz y en TODAS las subcarpetas
      const parentIds = [folderId, ...subfolders.map((s) => s.id)];
      const filesQuery = parentIds.map((pid) => `'${pid}' in parents`).join(' or ') + ' and trashed = false and mimeType != \'application/vnd.google-apps.folder\'';
      const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(filesQuery)}&fields=files(id,name,parents)&pageSize=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await filesRes.json();
      
      if (data.files && data.files.length > 0) {
        // Filtramos por extensiones válidas (incluyendo .cso y .pbp para PSP)
        const validFiles = data.files.filter((file: any) => {
          const name = file.name.toLowerCase();
          return /\.(sfc|smc|nes|gba|z64|n64|v64|bin|iso|cue|chd|cso|pbp)$/i.test(name);
        });

        if (validFiles.length === 0) {
          toast({ title: 'Carpeta vacía', description: 'Tu carpeta RetroRoms no tiene juegos compatibles.' });
          setIsSyncing(false);
          return;
        }

        toast({ title: 'Detectando juegos...', description: `Guardando ${validFiles.length} juegos de tu carpeta RetroRoms...` });

        // 🎨 Recuperamos portadas/nombres personalizados guardados
        const { data: savedCovers } = await supabase
          .from('user_game_covers' as any)
          .select('file_name, custom_name, custom_cover_url')
          .eq('user_id', user!.id);
        const coverMap = new Map<string, { custom_name: string | null; custom_cover_url: string | null }>();
        (savedCovers || []).forEach((c: any) => {
          coverMap.set(c.file_name, { custom_name: c.custom_name, custom_cover_url: c.custom_cover_url });
        });

        const gamesToSave = validFiles.map((file: any) => {
          const restored = coverMap.get(file.name);
          const parentHint = (file.parents || []).map((p: string) => parentToConsole.get(p)).find(Boolean) || null;
          return {
            user_id: user?.id,
            drive_file_id: file.id,
            file_name: file.name,
            console_type: getConsoleType(file.name, parentHint),
            ...(restored?.custom_name ? { custom_name: restored.custom_name } : {}),
            ...(restored?.custom_cover_url ? { custom_cover_url: restored.custom_cover_url } : {}),
          };
        });

        const { error } = await supabase
          .from('user_drive_games' as any)
          .upsert(gamesToSave, { onConflict: 'user_id,drive_file_id' });

        if (error) {
          console.error('[DriveSync] upsert error', error);
          throw error;
        }

        await checkLinkedState();
        setIsLinked(true);
        const restoredCount = gamesToSave.filter((g: any) => g.custom_name || g.custom_cover_url).length;
        toast({
          title: '¡Sincronización Completa!',
          description: restoredCount > 0
            ? `Tus juegos ya están en tu biblioteca. Recuperamos ${restoredCount} portadas personalizadas.`
            : 'Tus juegos ya están en tu biblioteca.'
        });
        if (onSyncComplete) onSyncComplete();

      } else {
        toast({ title: 'Carpeta Vacía', description: 'Tu carpeta "RetroRoms" está vacía.' });
      }
    } catch (error: any) {
      console.error('[DriveSync] fetchAndSaveRoms failed', error);
      toast({ title: 'Error de red', description: error?.message || 'Hubo un problema leyendo tu Drive.', variant: 'destructive' });
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