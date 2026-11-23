"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Digitar para filtrar...",
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    const term = searchTerm.toLowerCase();
    const matchLabel = opt.label.toLowerCase().includes(term);
    const matchSub = opt.sublabel?.toLowerCase().includes(term);
    return matchLabel || matchSub;
  });

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Botão de Exibição / Gatilho */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 h-9 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 transition text-left"
      >
        <span className="truncate text-zinc-900">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>

      {/* Dropdown com Campo de Busca Digitável */}
      {isOpen && (
        <div className="absolute right-0 left-0 sm:left-auto sm:right-0 mt-1 min-w-[280px] max-w-[360px] bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in duration-100">
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 p-0.5"
                >
                  <X className="w-3 h-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-zinc-50">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                Nenhum resultado para &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition ${
                      isSelected
                        ? "bg-zinc-900 text-white font-medium"
                        : "hover:bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className={`text-[10px] truncate ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={1.5} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
