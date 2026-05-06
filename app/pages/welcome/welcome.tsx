import OpenDataLoaderConverter from "~/features/conversion/OpenDataLoaderConverter-v2";

// Pantalla principal: contiene el marco visual y delega la logica al feature de conversion.
export function Welcome() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-12 max-w-360 mx-auto">
      <header className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500 mb-3">Bienvenido a</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-linear-to-r from-cyan-400 via-sky-500 to-blue-600 text-transparent bg-clip-text">
          CADE File converter
        </h1>
      </header>
      <OpenDataLoaderConverter/>
    </main>
  );
}
