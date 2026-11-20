import { z } from "zod";

export const socialFormats = ["Reels", "Carrossel", "Stories", "Post estático"] as const;
export const publicationPlatforms = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Outra"] as const;
export const performanceMetrics = {
  impressions: "Impressões", clicks: "Cliques", leads: "Leads", sales: "Vendas",
} as const;
export type Metric = keyof typeof performanceMetrics;
export const materialLabels = {
  headline: "Headline e subtítulo",
  selected_caption: "Legenda",
  selected_reels: "Roteiro",
  selected_carousel: "Carrossel",
  image_url: "Imagem",
  visual_prompt: "Prompt visual",
  copy_site_lp: "Texto da página",
  copy_meta_ads: "Copy Meta Ads",
  copy_google_ads: "Copy Google Ads",
} as const;
export type Material = keyof typeof materialLabels;
export type Snapshot = { text: string; subtitle?: string };
type PieceMaterials = Partial<Record<Exclude<Material, "headline"> | "selected_headline" | "selected_subheadline", string | null>> & { stale_materials?: string[] };
export type Review = {
  id: string; material: Material; version: number; snapshot: Snapshot;
  decision: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  submitted_by: string; submitted_by_email?: string | null; submitted_at: string;
  decided_by: string | null; decided_by_email?: string | null; decided_at: string | null; comment: string | null;
};
export type Publication = {
  platform: string; url: string; published_at: string; objective: string | null; primary_metric: Metric;
};
export type Measurement = Record<Metric, number> & { id: string; date_from: string; date_to: string; source: string };
export type DeliveryState = {
  materials: { key: Material; snapshot: Snapshot; stale: boolean; current: Review | null }[];
  reviews: Review[];
  publication: Publication | null;
  measurements: Measurement[];
  totals: Record<Metric, number>;
  ready: boolean;
  origin: { id: string; title: string } | null;
  derivatives: { id: string; title: string; format: string }[];
};

export const deliveryAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SUBMIT"), material: z.custom<Material>(value => typeof value === "string" && Object.hasOwn(materialLabels, value)),
    snapshot: z.object({ text: z.string().max(200000), subtitle: z.string().max(10000).optional() }) }),
  z.object({ action: z.literal("DECIDE"), reviewId: z.uuid(), decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]), comment: z.string().trim().max(2000).default("") }),
  z.object({ action: z.literal("PUBLISH"), platform: z.enum(publicationPlatforms), url: z.url({ protocol: /^https?$/ }).max(2000),
    publishedAt: z.iso.datetime({ offset: true }), primaryMetric: z.enum(["impressions", "clicks", "leads", "sales"]) }),
  z.object({ action: z.literal("DERIVE"), format: z.enum(socialFormats), date: z.iso.date().optional(), draftId: z.uuid() }),
  z.object({ action: z.literal("MEASURE"), from: z.iso.date(), to: z.iso.date(), source: z.string().trim().min(1).max(300),
    impressions: z.number().int().min(0).max(2147483647), clicks: z.number().int().min(0).max(2147483647),
    leads: z.number().int().min(0).max(2147483647), sales: z.number().int().min(0).max(2147483647) }),
]);

export function reviewMaterials(piece: PieceMaterials, reviews: Review[]) {
  return (Object.keys(materialLabels) as Material[]).flatMap(key => {
    const text = (key === "headline" ? piece.selected_headline : piece[key])?.trim();
    if (!text || key === "visual_prompt") return []; // O prompt é insumo, a imagem é a entrega.
    const snapshot = key === "headline" ? { text, subtitle: piece.selected_subheadline?.trim() || "" } : { text };
    const latest = reviews.find(review => review.material === key);
    const current = latest?.snapshot.text === snapshot.text && latest.snapshot.subtitle === snapshot.subtitle ? latest : null;
    return [{ key, snapshot, stale: !!piece.stale_materials?.includes(key), current }];
  });
}

export function publicationReady(materials: ReturnType<typeof reviewMaterials>) {
  return materials.some(item => item.key !== "headline") &&
    materials.every(item => !item.stale && item.current?.decision === "APPROVED");
}
