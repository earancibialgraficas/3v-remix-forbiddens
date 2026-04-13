import { useState, useEffect, createContext, useContext } from "react";
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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, roles: [], loading: true,
  isAdmin: false, isMasterWeb: false, signOut: async () => {}, refreshProfile: async () => {},
  isReady: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data) setProfile(data as unknown as Profile);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (data) setRoles(data.map((r: any) => r.role));
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRoles(user.id);
    }
  };

  useEffect(() => {
    // Restore session FIRST to avoid race conditions on mobile
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin") || roles.includes("master_web");
  const isMasterWeb = roles.includes("master_web");

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, isAdmin, isMasterWeb, signOut, refreshProfile, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
