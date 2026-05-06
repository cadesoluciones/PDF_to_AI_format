// Chrome DevTools solicita esta URL en desarrollo. Respondemos vacio para evitar ruido en consola.
export function loader() {
  return Response.json({});
}
