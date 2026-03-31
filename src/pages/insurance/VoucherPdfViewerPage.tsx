import React, { useEffect, useMemo, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

const VoucherPdfViewerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);
  const [retryKey, setRetryKey] = useState(0);

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
  const pdfEndpoint = useMemo(() => {
    if (!apiBase || !queryString) return null;
    const separator = queryString.includes("?") ? "&" : "&";
    return `${apiBase}/insurance/vouchers/pdf?${queryString}${separator}refresh=${retryKey}`;
  }, [apiBase, queryString, retryKey]);
  const downloadFileName = useMemo(() => {
    if (!pdfEndpoint) return "voucher.pdf";
    const params = new URLSearchParams(queryString);
    const travelerIds = params.get("travelers")?.replace(/,/g, "-") ?? "voucher";
    return `voucher-${travelerIds}.pdf`;
  }, [pdfEndpoint, queryString]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [pdfEndpoint]);

  if (!pdfEndpoint) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center p-6">
        <style>{`.whatsapp-floating-button { display: none !important; }`}</style>
        <div className="max-w-md w-full rounded-xl border border-base-300 bg-base-100 p-5 text-center shadow">
          <p className="text-sm text-error font-semibold">No se pudo construir la URL del voucher.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-4"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setRetryKey((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`.whatsapp-floating-button { display: none !important; }`}</style>
      {isLoading && !error && (
        <div className="fixed inset-0 z-10 bg-white flex items-center justify-center">
          <div className="text-center">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="mt-3 text-sm text-base-content/70">Cargando voucher...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="fixed inset-0 z-20 bg-white flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-base-300 bg-base-100 p-5 text-center shadow">
            <p className="text-sm text-error font-semibold">{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-4"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setRetryKey((value) => value + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      <div className="md:hidden sticky top-0 z-20 bg-white/95 border-b border-base-200 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Vista previa del voucher</p>
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
            title="Voucher preview"
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
          title="Descargar voucher"
        >
          <FaDownload />
        </a>
      )}
      <iframe
        title="Voucher PDF"
        src={pdfEndpoint}
        className="w-screen h-screen border-0"
        onLoad={() => {
          setIsLoading(false);
          setError(null);
        }}
        onError={() => {
          setIsLoading(false);
          setError("No se pudo cargar el voucher. Intenta nuevamente.");
        }}
      />
    </>
  );
};

export default VoucherPdfViewerPage;
