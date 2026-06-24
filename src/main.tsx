import { createRoot } from "react-dom/client";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import App from "./App.tsx";
import "./index.css";
import "./styles/skin-mi-melodia-final.css";
import "./styles/social-hub-skins.css";
import "./styles/themed-selects.css";

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
