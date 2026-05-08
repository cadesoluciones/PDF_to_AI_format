import type { Route } from "./+types/home";
import { Welcome } from "../pages/welcome/welcome";

// Metadatos de la ruta index. Se pueden personalizar cuando el producto tenga copy final.
export function meta({}: Route.MetaArgs) {
  return [
    { title: "CADE File converter" },
    { name: "description", content: "Convierte PDFs a JSON o Markdown con vista previa y descarga de resultados." },
  ];
}

// Puente de ruta: mantiene React Router separado de la pantalla real.
export default function Home() {
  return <Welcome />;
}
