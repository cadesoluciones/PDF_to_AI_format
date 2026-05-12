import { useState } from "react";
import JSZip from "jszip";
import { CgSoftwareDownload, CgClipboard } from "react-icons/cg";
import type { ConversionResponse, ConversionResultItem } from "../conversion/conversionTypes";

interface ConversionDisplayProps {
  result: ConversionResponse | null;
  error: string | null;
  isLoading: boolean;
}

// Transforma la respuesta de cada conversión en texto apto para mostrar, copiar o descargar.
function getOutputText(item: ConversionResultItem) {
  if (!item.data) return "";
  return typeof item.data === "object" ? JSON.stringify(item.data, null, 2) : String(item.data);
}

// El tipo MIME se decide por extensión para mantener coherencia con el modo de conversión elegido.
function getMimeType(fileName?: string) {
  return fileName?.toLowerCase().endsWith(".json") ? "application/json" : "text/markdown";
}

// Gestiona la descarga local creando una URL temporal, activando un enlace y liberando el recurso.
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Genera un nombre de respaldo cuando el backend no incluye fileName en un resultado válido.
function getFallbackFileName(item: ConversionResultItem, index: number) {
  if (item.fileName) {
    return item.fileName;
  }

  const baseName = item.originalName.replace(/\.pdf$/i, "") || `resultado-${index + 1}`;
  return `${baseName}.md`;
}

export default function ConversionDisplay({ result, error, isLoading }: ConversionDisplayProps) {
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState<{
    key: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  const results = result?.results ?? [];

  // Solo los resultados correctos con contenido textual se habilitan para copiar, descargar o empaquetar.
  const successfulResults = results.filter((item) =>
    item.success && getOutputText(item)
  );

  const resultError = result && !result.success ? result.error : null;

  const downloadFile = (item: ConversionResultItem, index: number) => {
    const outputText = getOutputText(item);
    if (!outputText) {
      return;
    }

    const fileName = getFallbackFileName(item, index);
    const blob = new Blob([outputText], { type: getMimeType(fileName) });
    downloadBlob(blob, fileName);
  };

  const downloadZip = async () => {
    if (successfulResults.length === 0) {
      return;
    }

    setIsCreatingZip(true);

    try {
      // El ZIP se genera en el navegador a partir de los resultados ya recibidos desde la API.
      const zip = new JSZip();
      successfulResults.forEach((item, index) => {
        zip.file(getFallbackFileName(item, index), getOutputText(item));
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `conversion-${result?.mode ?? "resultado"}.zip`);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const copyToClipboard = async (item: ConversionResultItem, resultKey: string) => {
    const outputText = getOutputText(item);
    if (!outputText) {
      return;
    }

    // La API de Clipboard puede no existir en algunos navegadores o contextos no seguros.
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setClipboardStatus({
        key: resultKey,
        message: "No se pudo copiar al portapapeles.",
        type: "error",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText);
      setClipboardStatus({
        key: resultKey,
        message: "Copiado al portapapeles.",
        type: "success",
      });
    } catch {
      setClipboardStatus({
        key: resultKey,
        message: "No se pudo copiar al portapapeles.",
        type: "error",
      });
    }
  };

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Estado</p>

      {isLoading && !result && !error && (
        <p className="mt-3 text-sm text-sky-600 animate-pulse">Procesando...</p>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {resultError && <p className="mt-3 text-sm text-rose-600">{resultError}</p>}

      {results.length > 0 ? (
        <div className="mt-6 min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Resultados</p>
              <p className="text-xs text-slate-500">
                {successfulResults.length} de {results.length} documentos convertidos.
              </p>
            </div>

            {successfulResults.length > 1 && (
              <button
                type="button"
                onClick={downloadZip}
                disabled={isCreatingZip}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2"
              >
                <CgSoftwareDownload />
                {isCreatingZip ? "Preparando ZIP..." : "Descargar ZIP"}
              </button>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {results.map((item, index) => {
              const outputText = getOutputText(item);
              const resultKey = `${item.originalName}-${index}`;
              const itemClipboardStatus = clipboardStatus?.key === resultKey ? clipboardStatus : null;

              return (
                <div key={resultKey} className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 overflow-hidden">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="break-all text-sm font-medium text-slate-900">{item.fileName || item.originalName}</span>
                      {!item.success && item.error && (
                        <p className="mt-1 text-xs text-rose-600">{item.error}</p>
                      )}
                    </div>

                    {item.success && outputText && (
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item, resultKey)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                          >
                            <CgClipboard />
                            Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadFile(item, index)}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition flex items-center gap-2"
                          >
                            <CgSoftwareDownload />
                            {successfulResults.length > 1 ? "Descargar" : "Descargar archivo"}
                          </button>
                        </div>

                        {itemClipboardStatus && (
                          <p
                            className={`text-xs ${
                              itemClipboardStatus.type === "success" ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {itemClipboardStatus.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {item.success && outputText && (
                    <>
                      {/* overflow-auto y break-all protegen el layout frente a textos o data URI muy largos. */}
                      <pre className="max-h-96 max-w-full overflow-auto whitespace-pre-wrap break-all text-left text-sm leading-relaxed text-slate-900">
                        {outputText}
                      </pre>
                    </>
                  )}

                  {item.success && !outputText && (
                    <p className="text-sm text-slate-500">El archivo se convirtió, pero no contiene texto para mostrar.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !isLoading && !error && <p className="mt-3 text-sm text-slate-400 italic">Esperando archivo...</p>
      )}
    </div>
  );
}
