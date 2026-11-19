import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getLeadKanbanStatus } from "@/modules/crm/lead-kanban";
import { LeadKanban } from "@/components/crm/lead-kanban";
import type { LeadRecord, LeadStatus } from "@/modules/crm/types";
import { UpdateLeadSchema } from "@/modules/crm/schemas";

const lead = (status: LeadStatus, id = status): LeadRecord => ({ id, status, leadCode: `LEAD-${id}`, personType: "PJ", name: `Contato ${id}`, source: "Indicação", createdAt: "2026-11-19", updatedAt: "2026-11-19" });

describe("Kanban dos leads", () => {
  it("aceita Stand-by na atualização e exibe o lead na coluna correspondente", () => {
    expect(UpdateLeadSchema.parse({ status: "STAND_BY" }).status).toBe("STAND_BY");
    expect(getLeadKanbanStatus(lead("STAND_BY"))).toBe("STAND_BY");
    const html = renderToStaticMarkup(<LeadKanban loading={false} leads={[lead("STAND_BY")]} />);
    expect(html).toContain("Stand-by");
    expect(html.match(/href="\/crm\/leads\/STAND_BY"/g)).toHaveLength(1);
  });
  it.each([["NEW", "NOVO"], ["CONTACTED", "QUALIFICANDO"], ["QUALIFIED", "QUALIFICADO"], ["UNQUALIFIED", "DESQUALIFICADO"]] as const)("agrupa status legado %s em %s", (status, expected) => {
    expect(getLeadKanbanStatus(lead(status))).toBe(expected);
  });
  it("identifica cliente vinculado mesmo com status legado desatualizado", () => {
    expect(getLeadKanbanStatus({ status: "NEW", convertedClientId: "cliente" })).toBe("CONVERTED");
  });
  it("exibe os seis status operacionais, cartões e links sem duplicar leads", () => {
    const html = renderToStaticMarkup(<LeadKanban loading={false} leads={[lead("NEW"), lead("NUTRICAO")]} />);
    expect(html).toContain("Novo (Triagem)");
    expect(html).toContain("Em Qualificação");
    expect(html).toContain("Em Nutrição");
    expect(html).toContain("Oportunidade Comercial");
    expect(html).toContain("Desqualificado");
    expect(html.match(/href="\/crm\/leads\/NEW"/g)).toHaveLength(1);
    expect(html.match(/href="\/crm\/leads\/NUTRICAO"/g)).toHaveLength(1);
    expect(html).not.toContain("Convertido em Cliente");
    expect(html).not.toContain("Arquivado");
  });
  it("exibe convertidos e arquivados quando retornados pelos filtros", () => {
    const html = renderToStaticMarkup(<LeadKanban loading={false} leads={[lead("CONVERTED"), lead("ARCHIVED")]} />);
    expect(html).toContain("Convertido em Cliente");
    expect(html).toContain("Arquivado");
  });
  it("mostra colunas vazias e informa carregamento", () => {
    expect(renderToStaticMarkup(<LeadKanban loading={false} leads={[]} />)).toContain("Nenhum lead nesta etapa");
    expect(renderToStaticMarkup(<LeadKanban loading leads={[]} />)).toContain("Carregando quadro");
  });
});
