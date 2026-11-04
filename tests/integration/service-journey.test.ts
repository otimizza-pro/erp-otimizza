import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import { ProposalService } from "@/modules/proposals/service";
import { configureBilling, generateServiceRecurrence, getBillingPlan } from "@/modules/contracts/journey-service";
import { createProject } from "@/modules/projects/service";
import { clientFiles, clientHistory, organizeClientFiles } from "@/modules/clients/workspace-service";

describe("Jornada de serviços e combos no PostgreSQL isolado", () => {
  it("preserva preços, gera contrato único, separa cobranças, clona onboarding e evita duplicação", async () => {
    const clientId = randomUUID(); let proposalId = ""; let contractId = "";
    await query("INSERT INTO clients(id,type,name) VALUES($1,'PJ','Teste jornada '||$2)", [clientId, randomUUID()]);
    try {
      const services = (await query<{ id: string; name: string; default_price: string; billing_unit: string }>("SELECT id,name,default_price,billing_unit FROM services WHERE name IN ('Domínio','Hospedagem de Site','Criação de WebSite','T.P. Google Ads') AND archived_at IS NULL ORDER BY name")).rows;
      expect(services.length).toBeGreaterThanOrEqual(4);
      const distinct = [...new Map(services.map(s => [s.name, s])).values()];
      const proposal = await ProposalService.createProposal({ title: "Proposta jornada", clientId, validUntil: "2027-12-31", globalDiscount: 85, items: distinct.map(s => ({ serviceId: s.id, referenceUnitPrice: Number(s.default_price), negotiatedUnitPrice: Number(s.default_price), quantity: 1, periodicity: s.billing_unit === "ANUAL" ? "YEARLY" : s.billing_unit === "MES" ? "MONTHLY" : "ONE_TIME" })) });
      proposalId = proposal.id;
      await expect(withTransaction(async client => {
        await ProposalService.approveProposal(proposalId, {}, client);
        await ProposalService.convertToContract(proposalId, { idempotencyKey: randomUUID(), dueDay: 99 }, client);
      })).rejects.toThrow("Dia de vencimento");
      expect((await ProposalService.getProposalById(proposalId))?.status).toBe("DRAFT");
      await ProposalService.approveProposal(proposalId, {});
      const conversion = await ProposalService.convertToContract(proposalId, { idempotencyKey: randomUUID(), dueDay: 31, startDate: "2027-01-01" });
      expect(conversion.contracts).toHaveLength(1); contractId = conversion.contracts[0].id;
      expect(conversion.contracts[0].status).toBe("DRAFT");
      expect(conversion.contracts[0].currentVersion?.totalAmount).toBe(1900);
      const repeat = await ProposalService.convertToContract(proposalId, { idempotencyKey: randomUUID(), dueDay: 31 });
      expect(repeat.contracts[0].id).toBe(contractId);
      const plan = await getBillingPlan(contractId);
      const input = { groupSamePeriod: true, items: plan.map(i => ({ itemId: i.id, firstDueDate: "2027-01-31", installments: i.periodicity === "ONE_TIME" ? 3 : 1 })) };
      const results = await Promise.all([configureBilling(contractId, input), configureBilling(contractId, input)]);
      expect(results.reduce((a, r) => a + r.createdCount, 0)).toBe(5);
      const financial = (await query<{ amount: string; periods: string; count: string }>(`SELECT r.original_amount AS amount,count(ri.id)::text AS count,string_agg(DISTINCT ci.periodicity,',') AS periods FROM receivables r JOIN receivable_items ri ON ri.receivable_id=r.id JOIN contract_items ci ON ci.id=ri.contract_item_id WHERE r.contract_id=$1 GROUP BY r.id`, [contractId])).rows;
      expect(financial.every(r => !r.periods.includes(","))).toBe(true);
      expect(financial.find(r => r.periods === "YEARLY")?.count).toBe("2");
      expect(financial.reduce((a, r) => a + Math.round(Number(r.amount) * 100), 0)).toBe(190000);
      expect(await generateServiceRecurrence(contractId, "2027-02")).toBe(1);
      expect(await generateServiceRecurrence(contractId, "2027-02")).toBe(0);
      const project = await createProject({ name: "Onboarding de serviços", clientId, contractId, useServiceOnboarding: true, startDate: "2027-01-01", dueDate: "2027-02-01" });
      expect(project.tasks?.some(t => t.title.includes("Purelymail"))).toBe(true);
      expect(project.tasks?.some(t => t.title.includes("palavras-chave"))).toBe(true);
      await organizeClientFiles(clientId, { action: "createFolder", name: "Estratégia" });
      const files = await clientFiles(clientId); expect(files.folders.some(f => f.name === "Estratégia")).toBe(true);
      expect(files.files.some(f => f.folder === "Contratos")).toBe(true);
      const history = await clientHistory(clientId, "Contratos"); expect(history.length).toBeGreaterThan(0); expect(history.every(e => e.category === "Contratos")).toBe(true);
    } finally {
      await query("DELETE FROM projects WHERE client_id=$1", [clientId]);
      await query("DELETE FROM client_activity_history WHERE client_id=$1", [clientId]);
      await query("DELETE FROM client_document_folders WHERE client_id=$1", [clientId]);
      if (contractId) {
        await query("DELETE FROM receivable_items WHERE receivable_id IN(SELECT id FROM receivables WHERE contract_id=$1)", [contractId]);
        await query("DELETE FROM receivables WHERE contract_id=$1", [contractId]);
        await query("DELETE FROM contract_item_schedules WHERE contract_item_id IN(SELECT ci.id FROM contract_items ci JOIN contract_versions cv ON cv.id=ci.contract_version_id WHERE cv.contract_id=$1)", [contractId]);
      }
      if (proposalId) { await query("DELETE FROM proposal_contract_conversions WHERE proposal_id=$1", [proposalId]); await query("UPDATE proposals SET contract_id=NULL WHERE id=$1", [proposalId]); }
      if (contractId) { await query("DELETE FROM contract_versions WHERE contract_id=$1", [contractId]); await query("DELETE FROM contracts WHERE id=$1", [contractId]); }
      if (proposalId) { await query("DELETE FROM proposal_events WHERE proposal_id=$1", [proposalId]); await query("DELETE FROM proposal_versions WHERE proposal_id=$1", [proposalId]); await query("DELETE FROM proposals WHERE id=$1", [proposalId]); }
      await query("DELETE FROM clients WHERE id=$1", [clientId]);
    }
  });
});
