import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { GameBubbleProvider } from "@/contexts/GameBubbleContext";
import MainLayout from "@/components/MainLayout";
import Index from "./pages/Index";
import ForumPage from "./pages/ForumPage";
import MembershipsPage from "./pages/MembershipsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmulatorPage from "./pages/EmulatorPage";
import BibliotecaPage from "./pages/BibliotecaPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ConsejosPage from "./pages/ConsejosPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import MessagesPage from "./pages/MessagesPage";
import EventosPage from "./pages/EventosPage";
import AyudaPage from "./pages/AyudaPage";
import PhotoWallPage from "./pages/PhotoWallPage";
import SocialReelsPage from "./pages/SocialReelsPage";
import NotFound from "./pages/NotFound";
import PublicProfilePage from "./pages/PublicProfilePage";
import RulesPage from "./pages/RulesPage";
import FeedPage from "./pages/FeedPage"; // 🔥 AQUÍ IMPORTAMOS EL NUEVO SUPER MURO
import VaultPage from "./pages/VaultPage";
import { Navigate } from "react-router-dom";
import { UpgradeProvider } from "@/components/UpgradeModal";
import GlobalAds from "@/components/GlobalAds"; // 🔥 IMPORTAMOS EL COMPONENTE DE ANUNCIOS

// Creamos la instancia fuera del componente para evitar errores de renderizado
const queryClient = new QueryClient();

function PasswordRecoveryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/reset-password") return;

    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search);
    const isRecoveryHash = hashParams.get("type") === "recovery" || location.hash.includes("type=recovery");
    const isRecoverySearch = searchParams.get("type") === "recovery";
    const isRootPkceRecovery = location.pathname === "/" && searchParams.has("code") && !searchParams.has("error");

    if (isRecoveryHash || isRecoverySearch || isRootPkceRecovery) {
      navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <GameBubbleProvider>
            
            {/* 🔥 EL VIGILANTE SILENCIOSO DE LOS ANUNCIOS 🔥 
                Al estar aquí adentro, ya puede usar el useAuth() para saber si el usuario es Premium */}
            <GlobalAds />

            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PasswordRecoveryRedirect />
              <UpgradeProvider>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/arcade/salas" element={<EmulatorPage />} />
                  <Route path="/arcade/biblioteca" element={<BibliotecaPage />} />
                  <Route path="/arcade/leaderboards" element={<LeaderboardPage />} />
                  <Route path="/arcade/consejos" element={<ConsejosPage />} />
                  <Route path="/gaming-anime/foro" element={<ForumPage />} />
                  <Route path="/gaming-anime/anime" element={<ForumPage />} />
                  <Route path="/gaming-anime/gaming" element={<ForumPage />} />
                  <Route path="/gaming-anime/creador" element={<ForumPage />} />
                  <Route path="/motociclismo/riders" element={<ForumPage />} />
                  <Route path="/motociclismo/taller" element={<ForumPage />} />
                  <Route path="/motociclismo/rutas" element={<ForumPage />} />
                  <Route path="/mercado/gaming" element={<ForumPage />} />
                  <Route path="/mercado/motor" element={<ForumPage />} />
                  
                  {/* 🔥 AQUÍ CONECTAMOS LA RUTA CON NUESTRO NUEVO COMPONENTE 🔥 */}
                  <Route path="/social/feed" element={<FeedPage />} />
                  
                  <Route path="/social/reels" element={<SocialReelsPage />} />
                  <Route path="/social/fotos" element={<PhotoWallPage />} />
                  <Route path="/trending" element={<ForumPage />} />
                  <Route path="/eventos" element={<EventosPage />} />
                  <Route path="/membresias" element={<MembershipsPage />} />
                  <Route path="/ayuda" element={<AyudaPage />} />
                  <Route path="/reglas" element={<RulesPage />} />
                  <Route path="/contacto" element={<Navigate to="/ayuda?seccion=contacto" replace />} />
                  <Route path="/privacidad" element={<Navigate to="/ayuda?seccion=privacidad" replace />} />
                  
                  {/* RUTAS CRÍTICAS PARA TUS BOTONES */}
                  <Route path="/perfil" element={<ProfilePage />} />
                  <Route path="/configuracion" element={<SettingsPage />} />
                  <Route path="/mensajes" element={<MessagesPage />} />
                  <Route path="/bandeja-publica" element={<MessagesPage />} />
                  <Route path="/notificaciones" element={<MessagesPage />} />

                  <Route path="/usuario/:userId" element={<PublicProfilePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/vault" element={<VaultPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
              </UpgradeProvider>
            </BrowserRouter>
          </GameBubbleProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;