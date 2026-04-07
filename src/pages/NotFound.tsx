import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="font-pixel text-4xl text-neon-green text-glow-green">404</h1>
        <p className="text-lg text-muted-foreground font-body">Página no encontrada</p>
        <Link to="/" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded font-body text-sm hover:bg-primary/80 transition-colors">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
