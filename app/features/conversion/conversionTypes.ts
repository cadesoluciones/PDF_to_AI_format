export type ConversionOptionMode = "json" | "markdown";

export interface ConversionOption {
  id: "pdf-json" | "pdf-markdown" | "dir-json" | "dir-markdown";
  title: string;
  description: string;
  icon: string;
  directory: boolean;
  mode: ConversionOptionMode;
}
