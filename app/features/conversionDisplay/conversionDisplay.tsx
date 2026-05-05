import { CgSoftwareDownload, CgClipboard  } from "react-icons/cg";
interface ConversionDisplayProps {
  result: any;
  error: string | null;
  isLoading: boolean;
}

export default function ConversionDisplay({ result, error, isLoading }: ConversionDisplayProps) {
  const outputText = result?.data
    ? typeof result.data === "object"
      ? JSON.stringify(result.data, null, 2)
      : String(result.data)
    : "";

  const isJson = result?.fileName?.toLowerCase().endsWith(".json") || typeof result?.data === "object";
  const fileName = result?.fileName || (isJson ? "resultado.json" : "resultado.md");

  const downloadFile = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: isJson ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!outputText) return;
    await navigator.clipboard.writeText(outputText);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Estado</p>

      {isLoading && !result && !error && (
        <p className="mt-3 text-sm text-sky-600 animate-pulse">Procesando...</p>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {result?.data ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Resultados</p>
              <p className="text-xs text-slate-500">Vista del contenido convertido.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
              >
                <CgClipboard />
                Copiar al portapapeles
              </button>
              <button
                type="button"
                onClick={downloadFile}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <CgSoftwareDownload />
                Descargar archivo
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 h-full min-h-96 overflow-auto">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-slate-900">{fileName}</span>
            </div>
            <pre className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-900">
              {outputText}
            </pre>
          </div>
        </div>
      ) : (
        !isLoading && !error && <p className="mt-3 text-sm text-slate-400 italic">Esperando archivo...</p>
      )}
    </div>
  );
}
