import React from "react";
import { createPortal } from "react-dom";

interface GlobalLoaderProps {
  message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ message = "Cargando..." }) => {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="app-global-loader fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-base-100/90 border border-white/20 rounded-3xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[260px]">
        <span className="loading loading-spinner loading-lg text-primary" aria-hidden="true" />
        <p className="text-sm text-base-content/70">{message}</p>
      </div>
    </div>,
    document.body
  );
};

export default GlobalLoader;
