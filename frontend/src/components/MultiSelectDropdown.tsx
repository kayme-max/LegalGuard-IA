import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = '-- Seleccione --',
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optionValue: string) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
    } else {
      onChange([...selected, optionValue]);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getSelectedLabel = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const found = options.find((o) => o.value === selected[0]);
      return found ? found.label : selected[0];
    }
    return `${selected.length} seleccionados`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-left cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-slate-300'
        }`}
      >
        <span className={`block truncate ${selected.length === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
          {getSelectedLabel()}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {selected.length > 0 && !disabled && (
            <span
              onClick={handleClearAll}
              className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-2 p-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto animate-fade-in">
          {options.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-400">
              No hay opciones disponibles
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggleOption(option.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 text-indigo-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
