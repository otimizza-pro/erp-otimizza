export const brainstormModes = {
  PILLARS: "Pilares e assuntos",
  NEWS: "Surfar na Onda",
  TRENDS: "Tendências",
  SEASONAL: "Datas Sazonais",
} as const;

export type BrainstormMode = keyof typeof brainstormModes;
