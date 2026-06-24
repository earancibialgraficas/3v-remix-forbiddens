import React from "react";

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[FORBIDDENS] Error de render capturado", error, errorInfo);
  }

  private reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("fb_reload", Date.now().toString());
    window.location.replace(url.href);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#06020a] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-xl border border-neon-magenta/40 bg-black/70 p-6 shadow-[0_0_35px_rgba(255,0,170,0.25)]">
          <p className="font-pixel text-[10px] uppercase tracking-[0.24em] text-neon-cyan">
            FORBIDDENS Launcher
          </p>
          <h1 className="mt-4 font-pixel text-lg text-neon-magenta">
            No se pudo cargar esta vista
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/78">
            La pagina encontro un error al renderizar, pero el launcher sigue vivo. Recarga para pedir una copia fresca del sitio.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={this.reload}
            className="mt-5 inline-flex items-center justify-center border border-neon-cyan/60 bg-neon-cyan/15 px-4 py-2 font-pixel text-[10px] uppercase tracking-[0.18em] text-neon-cyan transition hover:bg-neon-cyan/25"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
