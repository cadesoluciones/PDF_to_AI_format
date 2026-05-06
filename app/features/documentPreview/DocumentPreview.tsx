import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CgSoftwareUpload, CgTrash, CgTerminal, CgSpinner } from "react-icons/cg";

interface DocumentPreviewProps {
    files: File[];
    file: File | null;
    fileUrl: string | null;
    directoryMode: boolean;
    selectedOptionTitle?: string;
    processing: boolean;
    canProcess: boolean;
    onSelectFiles: (files: File[]) => void;
    onRemoveFile: () => void;
    onProcess: () => void;
}

// Visor y selector de documentos. No convierte: solo entrega archivos y dispara el procesamiento.
export default function DocumentPreview({
    files,
    file,
    fileUrl,
    directoryMode,
    selectedOptionTitle,
    processing,
    canProcess,
    onSelectFiles,
    onRemoveFile,
    onProcess,
}: DocumentPreviewProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    // Atributos usados por navegadores compatibles para permitir seleccionar una carpeta.
    const directoryInputProps = directoryMode ? { webkitdirectory: "", directory: "" } : {};

    useEffect(() => {
        // Al cambiar el documento de preview volvemos al inicio del PDF.
        setCurrentPage(1);
    }, [fileUrl]);

    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);

        if (selectedFiles.length > 0) {
            onSelectFiles(selectedFiles);
        }

        // Permite volver a elegir el mismo archivo/carpeta y disparar onChange otra vez.
        event.target.value = "";
    };

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex min-w-0 flex-col gap-4 w-full">
            {/* En modo carpeta el input acepta multiples archivos; en modo PDF solo uno. */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple={directoryMode}
                className="hidden"
                onChange={handleFileInputChange}
                {...directoryInputProps}
            />

            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <h4 className="text-base font-semibold text-slate-900">Visor de PDF</h4>
                        <p className="mt-1 text-sm text-slate-500">
                            {file ? "Documento cargado y listo para previsualizar." : "Selecciona PDF para cargar y previsualizar."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={triggerFilePicker}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition flex items-center gap-2"
                        >
                            <span><CgSoftwareUpload /></span>
                            {file ? "Cambiar documento" : directoryMode ? "Seleccionar carpeta" : "Seleccionar documento"}
                        </button>
                        {file && (
                            <button
                                type="button"
                                onClick={onRemoveFile}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                            >
                                <span><CgTrash /></span>
                                Quitar documento
                            </button>
                        )}
                    </div>
                </div>

                {file && (
                    <div className="mt-4 min-w-0 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                        <p>
                            <span className="font-semibold">{directoryMode ? "Vista previa:" : "Archivo:"}</span> <span className="break-all">{file.name}</span>
                        </p>
                        {directoryMode && (
                            <p className="mt-1">
                                <span className="font-semibold">PDFs seleccionados:</span> {files.length}
                            </p>
                        )}
                        <p className="mt-1">
                            <span className="font-semibold">Conversión:</span> {selectedOptionTitle || "Ninguna opción seleccionada"}
                        </p>
                    </div>
                )}
            </div>

            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {fileUrl ? (
                    <>
                        {/* El iframe usa una URL temporal creada en el padre a partir del File seleccionado. */}
                        <iframe
                            title="PDF Viewer"
                            src={`${fileUrl}#page=${currentPage}`}
                            className="h-150 w-full border-0"
                        />
                    </>
                ) : (
                    <div className="flex min-h-100 items-center justify-center p-8 text-center text-slate-500">
                        <div>
                            <p className="text-lg font-semibold">No hay documento cargado</p>
                            <p className="mt-2 text-sm">Carga un PDF para comenzar a visualizarlo aquí.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-[1.5fr_auto]">

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <button
                        type="button"
                        onClick={onProcess}
                        disabled={!canProcess || processing}
                        className="w-full rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                        {processing ? <CgSpinner className="animate-spin" /> : <CgTerminal />}
                        {processing ? "Procesando..." : directoryMode ? "Procesar documentos" : "Procesar documento"}
                    </button>
                    <p className="mt-3 text-sm text-slate-500">
                        {file
                            ? canProcess
                                ? directoryMode
                                    ? "Convierte todos los PDFs usando la opción seleccionada."
                                    : "Convierte el documento usando la opción seleccionada."
                                : "Selecciona una opción de conversión para procesar."
                            : directoryMode
                                ? "Carga una carpeta antes de procesar."
                                : "Carga un documento antes de procesar."}
                    </p>
                </div>
            </div>
        </div>
    );
}
