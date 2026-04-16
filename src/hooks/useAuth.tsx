import { useState, useEffect, createContext, useContext, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  membership_tier: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  total_score: number;
  role_icon: string | null;
  show_role_icon: boolean;
  signature: string | null;
  signature_image_url: string | null;
  signature_font: string | null;
  signature_color: string | null;
  signature_font_family: string | null;
  signature_stroke_color: string | null;
  signature_text_align: string | null;
  signature_image_align: string | null;
  signature_image_width: number | null;
  color_avatar_border: string | null;
  color_name: string | null;
  color_role: string | null;
  color_staff_role: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  isAdmin: boolean;
  isMasterWeb: boolean;
  isStaff: boolean;
  isMod: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isReady: boolean;
  pauseMusic: () => void;
  onPauseMusic: (cb: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, roles: [], loading: true,
  isAdmin: false, isMasterWeb: false, isStaff: false, isMod: false,
  signOut: async () => {}, refreshProfile: async () => {},
  isReady: false, pauseMusic: () => {}, onPauseMusic: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseMusicRef = useRef<(() => void) | null>(null);

  const pauseMusic = useCallback(() => { pauseMusicRef.current?.(); }, []);
  const onPauseMusic = useCallback((cb: () => void) => { pauseMusicRef.current = cb; }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      if (data) setProfile(data as unknown as Profile);
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (data) setRoles(data.map((r: any) => r.role));
    } catch (e) {
      console.error("Error fetching roles:", e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRoles(user.id);
    }
  };

  const markReady = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(false);
    setIsReady(true);
  }, []);

  useEffect(() => {
    // 1. Timeout de seguridad: Si en 2 segundos no responde, mostramos la web igual
    timeoutRef.current = setTimeout(markReady, 2000);

    // 2. Listener de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // FIX: Evitar que la música se detenga al cambiar de sesión
      // No hacemos window.location.reload() nunca.
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
        fetchRoles(currentSession.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
      markReady();
    });

    // 3. Carga inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        fetchProfile(initialSession.user.id);
        fetchRoles(initialSession.user.id);
      }
      markReady();
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [markReady]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    // NO HACER window.location.reload() para que no se pare la música
  };

  const isAdmin = roles.includes("admin") || roles.includes("master_web");
  const isMasterWeb = roles.includes("master_web");
  const isMod = roles.includes("moderator");
  const isStaff = isAdmin || isMasterWeb || isMod;

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading, isAdmin, isMasterWeb, isStaff, isMod,
      signOut, refreshProfile, isReady, pauseMusic, onPauseMusic,
    }}>
      {/* IMPORTANTE: Aquí NUNCA ponemos un "if (loading)". 
        Dejamos que {children} se renderice siempre para que el sitio 
        esté vivo y la música siga sonando.
      */}
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
