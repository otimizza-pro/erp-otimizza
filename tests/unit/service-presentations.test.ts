import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { emptyPresentation, ServicePresentationSchema } from "@/modules/catalog/presentation";
import { generateProposalPdf } from "@/modules/proposals/pdf";
import type { ProposalRecord, ProposalVersionRecord } from "@/modules/proposals/types";

describe("Apresentação comercial dos serviços", () => {
  it("aceita cadastros antigos e rejeita imagens externas e campos inválidos", () => {
    expect(ServicePresentationSchema.parse({})).toEqual(emptyPresentation);
    expect(() => ServicePresentationSchema.parse({ image: "https://example.com/image.png" })).toThrow();
    expect(() => ServicePresentationSchema.parse({ icon: "invalid" })).toThrow();
    expect(() => ServicePresentationSchema.parse({ headline: "x".repeat(181) })).toThrow();
  });
  it("pagina conteúdo extenso em paisagem e usa somente a apresentação congelada", async () => {
    const image = "data:image/png;base64," + (await readFile("public/brand/principal-cor.png")).toString("base64");
    expect(ServicePresentationSchema.parse({ image }).image).toBe(image);
    const proposal = { proposalCode: "PROP-PREVIEW", title: "Projeto de crescimento", recipientName: "Cliente Exemplo" } as ProposalRecord;
    const version = {
      versionNumber: 1, createdAt: "2026-11-02", recipientSnapshot: { name: "Cliente Exemplo" },
      commercialTermsSnapshot: { validUntil: "2026-12-02", internalNotes: "SEGREDO_INTERNO", servicePresentations: {
        service1: { ...emptyPresentation, image, overview: "Conteudo extenso para paginacao. ".repeat(350), setup: "SETUP_CONGELADO", exclusions: "EXCLUSAO_FINAL" },
      } },
      items: [{ serviceId: "service1", serviceName: "Consultoria", periodicity: "MONTHLY", quantity: 1, negotiatedUnitPrice: 1500, discountAmount: 0, totalAmount: 1500 }],
      totalOneTimeEffective: 0, totalMonthlyEffective: 1500, totalYearlyEffective: 0,
    } as unknown as ProposalVersionRecord;
    const pdf = (await generateProposalPdf(proposal, version)).toString("latin1");
    expect(pdf).toContain("SETUP_CONGELADO");
    expect(pdf).toContain("EXCLUSAO_FINAL");
    expect(pdf).not.toContain("SEGREDO_INTERNO");
    const pages = pdf.match(/\/Type \/Page\b/g) || [];
    expect(pages.length).toBeGreaterThan(7);
    const mediaBoxes = [...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)];
    expect(mediaBoxes).toHaveLength(pages.length);
    for (const box of mediaBoxes) expect(Number(box[1])).toBeGreaterThan(Number(box[2]));
    expect(pdf).toContain("/Subtype /Image");
    expect(pdf).toContain("de " + pages.length);
  });
});
