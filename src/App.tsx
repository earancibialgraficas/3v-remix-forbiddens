import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import MainLayout from "@/components/MainLayout";
import Index from "./pages/Index";
import ForumPage from "./pages/ForumPage";
import MembershipsPage from "./pages/MembershipsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EmulatorPage from "./pages/EmulatorPage";
import BibliotecaPage from "./pages/BibliotecaPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ConsejosPage from "./pages/ConsejosPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import EventosPage from "./pages/EventosPage";
import AyudaPage from "./pages/AyudaPage";
import PhotoWallPage from "./pages/PhotoWallPage";
import SocialReelsPage from "./pages/SocialReelsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/arcade/salas" element={<EmulatorPage />} />
              <Route path="/arcade/biblioteca" element={<BibliotecaPage />} />
              <Route path="/arcade/leaderboards" element={<LeaderboardPage />} />
              <Route path="/arcade/consejos" element={<ConsejosPage />} />
              <Route path="/gaming-anime" element={<ForumPage />} />
              <Route path="/gaming-anime/foro" element={<ForumPage />} />
              <Route path="/gaming-anime/anime" element={<ForumPage />} />
              <Route path="/gaming-anime/creador" element={<ForumPage />} />
              <Route path="/motociclismo" element={<ForumPage />} />
              <Route path="/motociclismo/riders" element={<ForumPage />} />
              <Route path="/motociclismo/taller" element={<ForumPage />} />
              <Route path="/motociclismo/rutas" element={<ForumPage />} />
              <Route path="/mercado" element={<ForumPage />} />
              <Route path="/mercado/gaming" element={<ForumPage />} />
              <Route path="/mercado/motor" element={<ForumPage />} />
              <Route path="/social" element={<ForumPage />} />
              <Route path="/social/feed" element={<ForumPage />} />
              <Route path="/social/reels" element={<SocialReelsPage />} />
              <Route path="/social/fotos" element={<PhotoWallPage />} />
              <Route path="/trending" element={<ForumPage />} />
              <Route path="/eventos" element={<EventosPage />} />
              <Route path="/membresias" element={<MembershipsPage />} />
              <Route path="/ayuda" element={<AyudaPage />} />
              <Route path="/reglas" element={<ForumPage />} />
              <Route path="/contacto" element={<ForumPage />} />
              <Route path="/privacidad" element={<ForumPage />} />
              <Route path="/faq" element={<ForumPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/configuracion" element={<SettingsPage />} />
              <Route path="/mensajes" element={<ForumPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
