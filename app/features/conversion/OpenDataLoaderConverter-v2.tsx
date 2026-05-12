import { useEffect, useState } from "react";
import { transformFile, transformFiles } from "../../api/processFile";
import ConversionDisplay from "../conversionDisplay/conversionDisplay";
import DocumentPreview from "../documentPreview/DocumentPreview";
import ConversionOptionsPanel from "./ConversionOptionsPanel";
import type { ConversionOption, ConversionResponse } from "./conversionTypes";

// Catálogo de opciones disponibles. La propiedad directory define si el flujo procesa un PDF o varios.
const conversionOptions: ConversionOption[] = [
  {
    id: "pdf-json",
    title: "PDF a JSON",
    description: "Carga un PDF y conviértelo a JSON estructurado.",
    icon: "/assets/file_conversion.png",
    directory: false,
    mode: "json",
  },
  {
    id: "pdf-markdown",
    title: "PDF a Markdown",
    description: "Carga un PDF y obtén una versión Markdown legible.",
    icon: "/assets/file_conversion.png",
    directory: false,
    mode: "markdown",
  },
  {
    id: "dir-json",
    title: "Directorio a JSON",
    description: "Carga una carpeta de PDFs y convierte todo a JSON.",
    icon: "/assets/folder.png",
    directory: true,
    mode: "json",
  },
  {
    id: "dir-markdown",
    title: "Directorio a Markdown",
    description: "Carga una carpeta de PDFs para convertirlos a Markdown.",
    icon: "/assets/folder.png",
    directory: true,
    mode: "markdown",
  },
];

export default function OpenDataLoaderConverter() {
  // Estado principal del conversor: coordina la opción activa, los archivos, la vista previa y la respuesta de la API.
  const [activeOption, setActiveOption] = useState<ConversionOption | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Si la opción activa es de directorio, el selector permite cargar múltiples PDFs desde una carpeta.
  const directoryMode = !!activeOption?.directory;

  useEffect(() => {
    if (!previewFile) {
      setFileUrl(null);
      return;
    }

    const nextFileUrl = URL.createObjectURL(previewFile);
    setFileUrl(nextFileUrl);

    // Cada URL temporal se libera al cambiar de PDF para evitar fugas de memoria en el navegador.
    return () => {
      URL.revokeObjectURL(nextFileUrl);
    };
  }, [previewFile]);

  const handleFileSelection = (files: File[]) => {
    // El navegador puede entregar otros archivos al seleccionar carpeta; solo los PDFs continúan el flujo.
    const pdfFiles = files.filter((file) => 
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length === 0) {
      setError("Solo se permiten archivos PDF.");
      return;
    }

    const nextFiles = directoryMode ? pdfFiles : [pdfFiles[0]];

    // selectedFiles contiene todos los PDFs procesables; previewFile alimenta únicamente la vista previa.
    setError(null);
    setSelectedFiles(nextFiles);
    setPreviewFile(nextFiles[0] ?? null);
    setResult(null);
  };

  const handleOptionClick = (option: ConversionOption) => {
    setActiveOption(option);
    setError(null);
    setResult(null);

    if (!option.directory && selectedFiles.length > 1) {
      // Si se cambia de carpeta a PDF individual, se conserva solo el primer documento seleccionado.
      const firstFile = selectedFiles[0];
      setSelectedFiles(firstFile ? [firstFile] : []);
      setPreviewFile(firstFile ?? null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFiles([]);
    setPreviewFile(null);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) {
      setError(directoryMode ? "No hay PDFs cargados para procesar." : "No hay un PDF cargado para procesar.");
      return;
    }

    if (!activeOption) {
      setError("Selecciona primero una opción de conversión.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      // El flujo individual envía un PDF; el flujo de carpeta envía la colección completa al backend.
      const response = activeOption.directory
        ? await transformFiles(selectedFiles, activeOption.mode)
        : await transformFile(selectedFiles[0], activeOption.mode);

      setResult(response);
    } catch (captureError: unknown) {
      setError(captureError instanceof Error ? captureError.message : "Error al procesar el archivo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-8 text-center">

      <ConversionOptionsPanel
        options={conversionOptions}
        activeOption={activeOption}
        onOptionSelect={handleOptionClick}
      />

      <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <DocumentPreview
          files={selectedFiles}
          file={previewFile}
          fileUrl={fileUrl}
          directoryMode={directoryMode}
          selectedOptionTitle={activeOption?.title}
          processing={isLoading}
          canProcess={selectedFiles.length > 0 && !!activeOption}
          onSelectFiles={handleFileSelection}
          onRemoveFile={handleRemoveFile}
          onProcess={handleProcess}
        />
        <ConversionDisplay result={result} error={error} isLoading={isLoading} />
      </div>
    </section>
  );
}
