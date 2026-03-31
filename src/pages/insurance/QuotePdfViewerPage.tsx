import React, { useEffect, useMemo, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

const QuotePdfViewerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
  const pdfEndpoint = useMemo(() => {
    if (!apiBase || !queryString) return null;
    return `${apiBase}/insurance/plans/pdf?${queryString}`;
  }, [apiBase, queryString]);
  const downloadFileName = useMemo(() => {
    if (!pdfEndpoint) return "cotizacion.pdf";
    const params = new URLSearchParams(queryString);
    const planId = params.get("plan_id") ?? "cotizacion";
    return `cotizacion-${planId}.pdf`;
  }, [pdfEndpoint, queryString]);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setHasError(false);
  }, [pdfEndpoint]);

  if (!pdfEndpoint) {
    return (
      <div className="w-screen h-screen bg-white">
        <style>{`.whatsapp-floating-button { display: none !important; }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`.whatsapp-floating-button { display: none !important; }`}</style>
      {!loaded && !hasError && (
        <div className="fixed inset-0 z-10 bg-white flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}
      {hasError && (
        <div className="fixed inset-0 z-10 bg-white flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-base-300 bg-base-100 p-5 text-center shadow">
            <p className="text-sm text-error font-semibold">No se pudo cargar la cotización.</p>
          </div>
        </div>
      )}
      <div className="md:hidden sticky top-0 z-20 bg-white/95 border-b border-base-200 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Vista previa de la cotización</p>
            <p className="text-xs text-base-content/70">Toca descargar para obtener el PDF completo.</p>
          </div>
          {pdfEndpoint && (
            <a
              href={pdfEndpoint}
              target="_blank"
              rel="noopener noreferrer"
              download={downloadFileName}
              className="btn btn-sm btn-primary"
            >
              <FaDownload className="mr-2" /> Descargar
            </a>
          )}
        </div>
        {pdfEndpoint && (
          <iframe
            title="Cotización preview"
            src={pdfEndpoint}
            className="mt-3 w-full h-56 rounded-2xl border border-base-200"
          />
        )}
      </div>
      {pdfEndpoint && (
        <a
          href={pdfEndpoint}
          target="_blank"
          rel="noopener noreferrer"
          download={downloadFileName}
          className="fixed bottom-4 right-4 z-30 btn btn-primary btn-circle shadow-xl"
          title="Descargar cotización"
        >
          <FaDownload />
        </a>
      )}
      <iframe
        title="Cotización PDF"
        src={pdfEndpoint}
        className="w-screen h-screen border-0"
        onLoad={() => {
          setLoaded(true);
          setHasError(false);
        }}
        onError={() => {
          setLoaded(false);
          setHasError(true);
        }}
      />
    </>
  );
};

export default QuotePdfViewerPage;
