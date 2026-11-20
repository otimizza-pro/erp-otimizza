const templates = {
  reels: [
    { key: "script", label: "Roteiro pronto" },
    { key: "recording", label: "Vídeo gravado" },
    { key: "editing", label: "Vídeo editado" },
    { key: "cover", label: "Capa pronta" },
    { key: "caption", label: "Legenda pronta" },
  ],
  carousel: [
    { key: "cover", label: "Capa pronta" },
    { key: "slides", label: "Slides prontos" },
    { key: "caption", label: "Legenda pronta" },
  ],
  static: [
    { key: "art", label: "Arte pronta" },
    { key: "caption", label: "Legenda pronta" },
  ],
} as const;

export function productionChecklistTemplate(format: string) {
  const normalized = format.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const formatKey = ({
    reels: "reels", carousel: "carousel", carrossel: "carousel", "post estatico": "static", estatico: "static",
  } as Record<string, keyof typeof templates>)[normalized];
  return formatKey && Object.hasOwn(templates, formatKey) ? { formatKey, items: templates[formatKey] } : null;
}

export type ProductionChecklist = {
  formatKey: string | null;
  items: { key: string; label: string; completed: boolean }[];
};
