import { useEffect, useMemo, useState } from "react";
import { transformFile } from "../../api/processFile";
import ConversionDisplay from "../conversionDisplay/conversionDisplay";
import DocumentPreview from "../documentPreview/DocumentPreview";
import ConversionOptionsPanel from "./ConversionOptionsPanel";
import type { ConversionOption } from "./conversionTypes";

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
  const [activeOption, setActiveOption] = useState<ConversionOption | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableOptions = useMemo(() => conversionOptions, []);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleFileSelection = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF.");
      return;
    }

    setError(null);
    setActiveFile(file);
    setResult(null);

    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }

    setFileUrl(URL.createObjectURL(file));
  };

  const handleOptionClick = (option: ConversionOption) => {
    setActiveOption(option);
    setError(null);
  };

  const handleRemoveFile = () => {
    setActiveFile(null);
    setResult(null);
    setError(null);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
  };

  const handleProcess = async () => {
    if (!activeFile) {
      setError("No hay un PDF cargado para procesar.");
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
      const response = await transformFile(activeFile, activeOption.mode);
      setResult(response);
    } catch (captureError: any) {
      setError(captureError?.message || "Error al procesar el archivo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-8 text-center">

      <ConversionOptionsPanel
        options={availableOptions}
        activeOption={activeOption}
        onOptionSelect={handleOptionClick}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <DocumentPreview
          file={activeFile}
          fileUrl={fileUrl}
          fileName={activeFile?.name}
          selectedOptionTitle={activeOption?.title}
          processing={isLoading}
          canProcess={!!activeFile && !!activeOption}
          onSelectFile={handleFileSelection}
          onRemoveFile={handleRemoveFile}
          onProcess={handleProcess}
        />
        <ConversionDisplay result={result} error={error} isLoading={isLoading} />
      </div>
    </section>
  );
}

