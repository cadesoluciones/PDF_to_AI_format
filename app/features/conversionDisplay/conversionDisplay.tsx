import { useState } from "react";
import JSZip from "jszip";
import { CgSoftwareDownload, CgClipboard } from "react-icons/cg";
import type { ConversionResponse, ConversionResultItem } from "../conversion/conversionTypes";

interface ConversionDisplayProps {
  result: ConversionResponse | null;
  error: string | null;
  isLoading: boolean;
}

// Convierte cualquier data del backend en texto visible/descargable.
function getOutputText(item: ConversionResultItem) {
  if (!item.data) return "";
  return typeof item.data === "object" ? JSON.stringify(item.data, null, 2) : String(item.data);
}

// El mime se decide por extension para que la descarga sea coherente con el modo elegido.
function getMimeType(fileName?: string) {
  return fileName?.toLowerCase().endsWith(".json") ? "application/json" : "text/markdown";
}

// Descarga local en navegador: crea una URL temporal, pulsa un enlace y la libera.
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

// Evita perder la descarga si el backend no manda fileName por algun error parcial.
function getFallbackFileName(item: ConversionResultItem, index: number) {
  if (item.fileName){
    return item.fileName;
  } 

  const baseName = item.originalName.replace(/\.pdf$/i, "") || `resultado-${index + 1}`;
  return `${baseName}.md`;
}

export default function ConversionDisplay({ result, error, isLoading }: ConversionDisplayProps) {
  const [isCreatingZip, setIsCreatingZip] = useState(false);

  const results = result?.results ?? [];
  // Solo los items con exito y texto real entran en descarga/copiar/ZIP.

  const successfulResults = results.filter((item) =>
     item.success && getOutputText(item)
  );

  const resultError = result && !result.success ? result.error : null;

  const downloadFile = (item: ConversionResultItem, index: number) => {
    const outputText = getOutputText(item);
    if (!outputText){
      return;
    } 

    const fileName = getFallbackFileName(item, index);
    const blob = new Blob([outputText], { type: getMimeType(fileName) });
    downloadBlob(blob, fileName);
  };

  const downloadZip = async () => {
    if (successfulResults.length === 0){
      return;
    } 

    setIsCreatingZip(true);

    try {
      // El ZIP se genera en frontend con los resultados que ya estan renderizados.
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

  const copyToClipboard = async (item: ConversionResultItem) => {
    const outputText = getOutputText(item);
    if (!outputText){
      return;
    } 
    await navigator.clipboard.writeText(outputText);
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
              const fileName = getFallbackFileName(item, index);

              return (
                <div key={`${item.originalName}-${index}`} className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 overflow-hidden">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="break-all text-sm font-medium text-slate-900">{item.fileName || item.originalName}</span>
                      {!item.success && item.error && (
                        <p className="mt-1 text-xs text-rose-600">{item.error}</p>
                      )}
                    </div>

                    {item.success && outputText && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item)}
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
                    )}
                  </div>

                  {item.success && outputText && (
                    <>
                      {/* break-all y overflow-auto evitan que base64 largo rompa el layout. */}
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
