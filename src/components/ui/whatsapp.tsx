import React from "react";

export function formatWhatsAppNumber(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // Se tem 10 dígitos (DDD + 8 dígitos)
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Se tem 11 dígitos (DDD + 9 dígitos)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  // Se já inclui DDI 55
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return raw;
}

export function getWhatsAppUrl(phoneOrWhatsapp?: string | null, customMessage?: string): string | null {
  if (!phoneOrWhatsapp) return null;
  const digits = phoneOrWhatsapp.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  // Se não tiver código de país (55), adiciona Brasil (55)
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  const encodedMsg = customMessage ? `?text=${encodeURIComponent(customMessage)}` : "";
  return `https://wa.me/${fullNumber}${encodedMsg}`;
}

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15c-1.49 0-2.96-.4-4.24-1.16l-.3-.18-3.12.82.83-3.04-.2-.32a8.21 8.21 0 01-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.18 8.23zm4.51-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.98-.14.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.76-1.85-.2-.49-.4-.42-.56-.43h-.47c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.16 1.73 2.64 4.19 3.7 0.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.22-.17-.47-.3z" />
    </svg>
  );
}

interface WhatsAppLinkProps {
  number?: string | null;
  name?: string | null;
  message?: string;
  className?: string;
  label?: string;
  showIconOnly?: boolean;
}

export function WhatsAppLink({
  number,
  name,
  message,
  className = "",
  label,
  showIconOnly = false,
}: WhatsAppLinkProps) {
  const url = getWhatsAppUrl(
    number,
    message || (name ? `Olá ${name}, tudo bem? Entro em contato pela Otimizza.` : "Olá, tudo bem? Entro em contato pela Otimizza.")
  );

  if (!url || !number) {
    return <span className="text-zinc-400">-</span>;
  }

  const formatted = formatWhatsAppNumber(number);

  if (showIconOnly) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Abrir WhatsApp com ${name || formatted}`}
        className={`inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 transition shadow-2xs ${className}`}
      >
        <WhatsAppIcon className="w-4 h-4" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Iniciar conversa no WhatsApp com ${name || formatted}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition ${className}`}
    >
      <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span>{label || formatted}</span>
    </a>
  );
}

