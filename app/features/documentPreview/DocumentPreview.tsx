import { useRef, type ChangeEvent } from "react";
import { CgSoftwareUpload, CgTrash, CgTerminal, CgSpinner } from "react-icons/cg";

interface DocumentPreviewProps {
    files: File[];
    file: File | null;
    fileUrl: string | null;
    directoryMode: boolean;
    selectedOptionTitle?: string;
    processing: boolean;
    canProcess: boolean;
    previewFileIndex: number;
    previewFileCount: number;
    fileSelectionNotice: string | null;
    onSelectFiles: (files: File[]) => void;
    onRemoveFile: () => void;
    onProcess: () => void;
    onPreviewPrevious: () => void;
    onPreviewNext: () => void;
}

// Componente responsable de seleccionar documentos, mostrar la vista previa y notificar acciones al componente padre.
export default function DocumentPreview({
    files,
    file,
    fileUrl,
    directoryMode,
    selectedOptionTitle,
    processing,
    canProcess,
    previewFileIndex,
    previewFileCount,
    fileSelectionNotice,
    onSelectFiles,
    onRemoveFile,
    onProcess,
    onPreviewPrevious,
    onPreviewNext,
}: DocumentPreviewProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    // Atributos utilizados por navegadores compatibles para habilitar la selección de carpetas.
    const directoryInputProps = directoryMode ? { webkitdirectory: "", directory: "" } : {};
    const showPreviewNavigation = directoryMode && previewFileCount > 1;

    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);

        if (selectedFiles.length > 0) {
            onSelectFiles(selectedFiles);
        }

        // Restablece el input para permitir seleccionar de nuevo el mismo archivo o carpeta.
        event.target.value = "";
    };

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex min-w-0 flex-col gap-4 w-full">
            {/* En modo carpeta el input acepta múltiples archivos; en modo PDF individual solo uno. */}
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
                    <div className="mt-4 min-w-0 rounded-3xl border border-slate-100 bg-slate-50 p-5 text-left text-sm text-slate-700">
                        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    {directoryMode ? "Vista previa" : "Archivo"}
                                </p>
                                <p title={file.name} className="mt-1 truncate text-base font-semibold text-slate-900 md:text-lg">
                                    {file.name}
                                </p>
                            </div>

                            <div className="flex min-w-0 flex-col gap-2 md:min-w-[14rem]">
                                {directoryMode && (
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <p className="text-xs font-semibold uppercase text-slate-500">PDFs seleccionados</p>
                                        <p className="mt-1 text-base font-semibold text-slate-900">{files.length}</p>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <p className="text-xs font-semibold uppercase text-slate-500">Conversión</p>
                                    <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={selectedOptionTitle || "Ninguna opción seleccionada"}>
                                        {selectedOptionTitle || "Ninguna opción seleccionada"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {showPreviewNavigation && (
                            <div className="mt-5 border-t border-slate-200 pt-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-xs font-semibold uppercase text-slate-500">
                                        PDF {previewFileIndex + 1} DE {previewFileCount}
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={onPreviewPrevious}
                                            disabled={previewFileIndex === 0}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onPreviewNext}
                                            disabled={previewFileIndex >= previewFileCount - 1}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {fileSelectionNotice && (
                            <p className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
                                {fileSelectionNotice}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {fileUrl ? (
                    <>
                        {/* El iframe consume la URL temporal creada por el padre a partir del PDF seleccionado. */}
                        <iframe
                            title="PDF Viewer"
                            src={`${fileUrl}#page=1`}
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

            <div className="w-full">

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
