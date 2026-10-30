"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Check, X, ChevronDown, Loader2 } from "lucide-react";

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string | null;
  badge?: string | null;
  data?: unknown;
}

interface AutocompleteProps {
  value: string;
  selectedId?: string | null;
  onChange: (value: string, selectedOption?: AutocompleteOption | null) => void;
  options?: AutocompleteOption[];
  fetchOptions?: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
  id?: string;
}

export function Autocomplete({
  value,
  selectedId,
  onChange,
  options: staticOptions,
  fetchOptions,
  placeholder = "Digite para buscar...",
  required = false,
  disabled = false,
  allowCustom = true,
  className = "",
  id,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza estado interno caso a prop value mude externamente
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Busca opções com debounce caso fetchOptions seja fornecido
  useEffect(() => {
    let active = true;

    if (fetchOptions) {
      if (!isOpen && !searchTerm) return;
      setLoading(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetchOptions(searchTerm || "");
          if (active) {
            setFilteredOptions(res);
          }
        } catch {
          if (active) setFilteredOptions([]);
        } finally {
          if (active) setLoading(false);
        }
      }, 200);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else if (staticOptions) {
      if (!searchTerm) {
        setFilteredOptions(staticOptions);
      } else {
        const lower = searchTerm.toLowerCase();
        setFilteredOptions(
          staticOptions.filter(
            (o) =>
              o.label.toLowerCase().includes(lower) ||
              (o.sublabel && o.sublabel.toLowerCase().includes(lower)) ||
              (o.badge && o.badge.toLowerCase().includes(lower))
          )
        );
      }
    }
  }, [searchTerm, isOpen, fetchOptions, staticOptions]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Se não permitir custom e não tiver selecionado válido, reseta
        if (!allowCustom && !selectedId) {
          setSearchTerm("");
          onChange("", null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustom, selectedId, onChange]);

  const handleSelect = (option: AutocompleteOption) => {
    setSearchTerm(option.label);
    setIsOpen(false);
    onChange(option.label, option);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    onChange(val, null);
  };

  const handleClear = () => {
    setSearchTerm("");
    onChange("", null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full pl-3.5 pr-16 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition disabled:opacity-50"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5 text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : searchTerm ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-700 transition"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className="p-1 hover:text-slate-700 transition"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 text-xs">
          {filteredOptions.length === 0 ? (
            <div className="p-3.5 text-center text-slate-400">
              {loading ? "Buscando opções..." : "Nenhum resultado encontrado."}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selectedId === opt.id || value === opt.label;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 transition ${
                    isSelected ? "bg-emerald-50/50" : ""
                  }`}
                >
                  <div className="flex-1 pr-3 truncate">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? "text-emerald-900 font-semibold" : "text-slate-900"}`}>
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.sublabel && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{opt.sublabel}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
