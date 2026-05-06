import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Ruta principal de la app: la pantalla index carga app/routes/home.tsx.
export default [
  index("routes/home.tsx"),
  // Ruta silenciosa para la peticion automatica de Chrome DevTools en desarrollo.
  route(".well-known/appspecific/com.chrome.devtools.json", "routes/chrome-devtools.ts"),
] satisfies RouteConfig;
