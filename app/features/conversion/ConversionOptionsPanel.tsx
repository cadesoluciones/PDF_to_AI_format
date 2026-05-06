import type { ConversionOption } from "./conversionTypes";
import ConversionOptionCard from "./ConversionOptionCard";

interface ConversionOptionsPanelProps {
  options: ConversionOption[];
  activeOption: ConversionOption | null;
  onOptionSelect: (option: ConversionOption) => void;
}

// Panel sin estado propio: solo pinta las opciones y avisa al componente padre.
export default function ConversionOptionsPanel({ options, activeOption, onOptionSelect }: ConversionOptionsPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
      {options.map((option) => (
        <ConversionOptionCard
          key={option.id}
          option={option}
          selected={activeOption?.id === option.id}
          onSelect={onOptionSelect}
        />
      ))}
    </div>
  );
}
