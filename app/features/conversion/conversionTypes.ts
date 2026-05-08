// Modos reales que entiende el frontend y que tambien espera el backend.
export type ConversionOptionMode = "json" | "markdown";

// Configuracion de cada tarjeta de conversion mostrada en la UI.
export interface ConversionOption {
  id: "pdf-json" | "pdf-markdown" | "dir-json" | "dir-markdown";
  title: string;
  description: string;
  icon: string;
  directory: boolean;
  mode: ConversionOptionMode;
}

// Imagen extraida del PDF y embebida como texto base64 para que el resultado sea autocontenido.
export interface ConversionImageAsset {
  fileName: string;
  path: string;
  mimeType: string;
  dataUri: string;
}

// Representa el resultado de cada PDF convertido, tanto individual como dentro de una carpeta.
export interface ConversionResultItem {
  success: boolean;
  originalName: string;
  fileName?: string;
  data?: unknown;
  assets?: ConversionImageAsset[];
  error?: string;
}

// Respuesta general de conversion: un PDF devuelve un resultado, una carpeta devuelve varios.
export interface ConversionResponse {
  success: boolean;
  mode: ConversionOptionMode;
  results: ConversionResultItem[];
  error?: string;
}
