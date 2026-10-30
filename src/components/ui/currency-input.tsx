"use client";

import React, { useEffect, useState } from "react";
import { parseMoney } from "@/shared/money";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string | undefined;
  onChangeValue?: (numericValue: number) => void;
  wrapperClassName?: string;
  showCurrencySymbol?: boolean;
}

function formatDisplay(num: number): string {
  if (isNaN(num)) return "0,00";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function CurrencyInput({
  value,
  onChangeValue,
  wrapperClassName = "",
  className = "",
  disabled = false,
  placeholder = "0,00",
  showCurrencySymbol = true,
  onBlur,
  onFocus,
  ...rest
}: CurrencyInputProps) {
  const [text, setText] = useState<string>(() => {
    if (value === undefined || value === null || value === "") return "";
    const num = typeof value === "number" ? value : parseMoney(value);
    return num === 0 ? "" : formatDisplay(num);
  });
  const [isFocused, setIsFocused] = useState(false);

  // Sincroniza com alterações externas de value quando o usuário não estiver digitando ativamente
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || value === "") {
        setText("");
      } else {
        const num = typeof value === "number" ? value : parseMoney(value);
        setText(num === 0 ? "" : formatDisplay(num));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Permite apenas dígitos, vírgula, ponto e traço negativo
    raw = raw.replace(/[^\d.,-]/g, "");

    setText(raw);

    const numeric = parseMoney(raw);
    if (onChangeValue) {
      onChangeValue(numeric);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const numeric = parseMoney(text);
    if (text.trim() === "" || numeric === 0) {
      setText("");
      if (onChangeValue) onChangeValue(0);
    } else {
      setText(formatDisplay(numeric));
      if (onChangeValue) onChangeValue(numeric);
    }
    if (onBlur) onBlur(e);
  };

  return (
    <div className={`relative flex items-center ${wrapperClassName}`}>
      {showCurrencySymbol && (
        <span
          className="absolute left-3 font-semibold text-zinc-500 text-xs sm:text-sm select-none pointer-events-none"
          aria-hidden="true"
        >
          R$
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`${showCurrencySymbol ? "pl-9" : "pl-3"} ${className}`}
        {...rest}
      />
    </div>
  );
}
