"use client";

import { useEffect } from "react";

export function AutoResizeTextareaListener() {
  useEffect(() => {
    // Chromium 123+ suporta field-sizing: content nativamente via CSS.
    // Este listener provê compatibilidade e auto-ajuste contínuo para qualquer navegador.
    const supportsFieldSizing =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("field-sizing", "content");

    if (supportsFieldSizing) {
      return;
    }

    const adjust = (el: HTMLTextAreaElement) => {
      // Guarda altura temporária para recalcular scrollHeight com precisão
      const prevOverflow = el.style.overflowY;
      el.style.overflowY = "hidden";
      el.style.height = "auto";
      const computed = window.getComputedStyle(el);
      const minH = parseFloat(computed.minHeight) || 120;
      const targetHeight = Math.max(el.scrollHeight, minH);
      el.style.height = `${targetHeight}px`;
      el.style.overflowY = prevOverflow;
    };

    const handleInput = (e: Event) => {
      if (e.target instanceof HTMLTextAreaElement) {
        adjust(e.target);
      }
    };

    const handleFocus = (e: Event) => {
      if (e.target instanceof HTMLTextAreaElement) {
        adjust(e.target);
      }
    };

    const adjustAll = () => {
      document.querySelectorAll("textarea").forEach((node) => {
        if (node instanceof HTMLTextAreaElement) {
          adjust(node);
        }
      });
    };

    window.addEventListener("input", handleInput);
    window.addEventListener("focusin", handleFocus);
    adjustAll();

    // Observa novos textareas renderizados em modais ou abas
    const observer = new MutationObserver(() => {
      adjustAll();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("input", handleInput);
      window.removeEventListener("focusin", handleFocus);
      observer.disconnect();
    };
  }, []);

  return null;
}
