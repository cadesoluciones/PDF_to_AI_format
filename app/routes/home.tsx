import type { Route } from "./+types/home";
import { Welcome } from "../pages/welcome/welcome";

// Metadatos de la ruta index. Se pueden personalizar cuando el producto tenga copy final.
export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// Puente de ruta: mantiene React Router separado de la pantalla real.
export default function Home() {
  return <Welcome />;
}
