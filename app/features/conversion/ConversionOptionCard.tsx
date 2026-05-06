import type { ConversionOption } from "./conversionTypes";

interface ConversionOptionCardProps {
  option: ConversionOption;
  selected: boolean;
  onSelect: (option: ConversionOption) => void;
}

export default function ConversionOptionCard({ option, selected, onSelect }: ConversionOptionCardProps) {

    // La tarjeta no decide el flujo; envia la opcion completa al padre.
    function handleClick() {
        onSelect(option);
    }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group rounded-3xl border p-6 shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 ${
        selected
          ? "border-sky-500 bg-sky-50 ring-sky-300"
          : "border-slate-200 bg-white ring-slate-200"
      }`}
    >
      <div className="flex h-full flex-col items-center justify-between gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 transition-colors duration-300 group-hover:bg-sky-50">
          <img src={option.icon} alt={option.title} className="h-12 w-12" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-slate-900">{option.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{option.description}</p>
        </div>
      </div>
    </button>
  );
}
