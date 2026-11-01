import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export interface SearchItem {
  id: string;
  type: "CLIENT" | "LEAD" | "PROPOSAL" | "CONTRACT" | "RECEIVABLE" | "PAYABLE" | "PROJECT";
  title: string;
  subtitle: string;
  status?: string;
  href: string;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const searchPattern = `%${q}%`;

  try {
    const [clientsRes, leadsRes, proposalsRes, contractsRes, recRes, payRes, projRes] =
      await Promise.all([
        // 1. Clientes
        query<{ id: string; name: string; document: string | null; status: string }>(
          `SELECT id, name, document, status
           FROM clients
           WHERE name ILIKE $1 OR trade_name ILIKE $1 OR document ILIKE $1
           ORDER BY name ASC
           LIMIT 5`,
          [searchPattern]
        ),
        // 2. Leads
        query<{ id: string; name: string; trade_name: string | null; status: string }>(
          `SELECT id, name, trade_name, status
           FROM crm_leads
           WHERE name ILIKE $1 OR trade_name ILIKE $1 OR email ILIKE $1 OR document ILIKE $1
           ORDER BY name ASC
           LIMIT 5`,
          [searchPattern]
        ),
        // 3. Propostas
        query<{ id: string; proposal_code: string; title: string; recipient_name: string; status: string }>(
          `SELECT p.id, p.proposal_code, p.title,
                  COALESCE(cl.name, l.name, pv.recipient_snapshot->>'name', 'Cliente/Lead') as recipient_name,
                  p.status
           FROM proposals p
           LEFT JOIN clients cl ON cl.id = p.client_id
           LEFT JOIN crm_leads l ON l.id = p.lead_id
           LEFT JOIN proposal_versions pv ON pv.proposal_id = p.id AND pv.version_number = p.current_version_number
           WHERE p.proposal_code ILIKE $1 OR p.title ILIKE $1 OR cl.name ILIKE $1 OR l.name ILIKE $1
           ORDER BY p.created_at DESC
           LIMIT 5`,
          [searchPattern]
        ),
        // 4. Contratos
        query<{ id: string; contract_number: string; client_name: string; status: string }>(
          `SELECT c.id, c.contract_number, cl.name as client_name, c.status
           FROM contracts c
           JOIN clients cl ON cl.id = c.client_id
           WHERE c.contract_number ILIKE $1 OR cl.name ILIKE $1
           ORDER BY c.created_at DESC
           LIMIT 5`,
          [searchPattern]
        ),
        // 5. Contas a Receber
        query<{ id: string; receivable_number: string; description: string; original_amount: number; status: string }>(
          `SELECT id, receivable_number, description, original_amount, status
           FROM receivables
           WHERE receivable_number ILIKE $1 OR description ILIKE $1
           ORDER BY due_date DESC
           LIMIT 5`,
          [searchPattern]
        ),
        // 6. Contas a Pagar
        query<{ id: string; payable_number: string; description: string; supplier_name: string; status: string }>(
          `SELECT id, payable_number, description, supplier_name, status
           FROM payables
           WHERE payable_number ILIKE $1 OR description ILIKE $1 OR supplier_name ILIKE $1
           ORDER BY due_date DESC
           LIMIT 5`,
          [searchPattern]
        ),
        // 7. Projetos
        query<{ id: string; project_code: string; name: string; status: string }>(
          `SELECT id, project_number as project_code, name, status
           FROM projects
           WHERE project_number ILIKE $1 OR name ILIKE $1
           ORDER BY created_at DESC
           LIMIT 5`,
          [searchPattern]
        ),
      ]);

    const items: SearchItem[] = [];

    // Clientes
    for (const c of clientsRes.rows) {
      items.push({
        id: c.id,
        type: "CLIENT",
        title: c.name,
        subtitle: c.document ? `CPF/CNPJ: ${c.document}` : "Cliente cadastrado",
        status: c.status,
        href: `/clients/${c.id}`,
      });
    }

    // Leads
    for (const l of leadsRes.rows) {
      items.push({
        id: l.id,
        type: "LEAD",
        title: l.name,
        subtitle: l.trade_name ? `Empresa: ${l.trade_name}` : "Lead no CRM",
        status: l.status,
        href: `/crm/leads/${l.id}`,
      });
    }

    // Propostas
    for (const p of proposalsRes.rows) {
      items.push({
        id: p.id,
        type: "PROPOSAL",
        title: `${p.proposal_code} • ${p.title}`,
        subtitle: `Destinatário: ${p.recipient_name}`,
        status: p.status,
        href: `/proposals/${p.id}`,
      });
    }

    // Contratos
    for (const ct of contractsRes.rows) {
      items.push({
        id: ct.id,
        type: "CONTRACT",
        title: `Contrato ${ct.contract_number}`,
        subtitle: `Cliente: ${ct.client_name}`,
        status: ct.status,
        href: `/contracts/${ct.id}`,
      });
    }

    // Recebíveis
    for (const r of recRes.rows) {
      items.push({
        id: r.id,
        type: "RECEIVABLE",
        title: `${r.receivable_number} • ${r.description}`,
        subtitle: `Valor: R$ ${Number(r.original_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        status: r.status,
        href: `/financial/receivables/${r.id}`,
      });
    }

    // A Pagar
    for (const p of payRes.rows) {
      items.push({
        id: p.id,
        type: "PAYABLE",
        title: `${p.payable_number} • ${p.description}`,
        subtitle: `Fornecedor: ${p.supplier_name}`,
        status: p.status,
        href: `/financial/payables/${p.id}`,
      });
    }

    // Projetos
    for (const pj of projRes.rows) {
      items.push({
        id: pj.id,
        type: "PROJECT",
        title: `${pj.project_code} • ${pj.name}`,
        subtitle: `Status: ${pj.status}`,
        status: pj.status,
        href: `/projects/${pj.id}`,
      });
    }

    return NextResponse.json(
      { results: items, total: items.length },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Erro na busca global:", error);
    const msg = error instanceof Error ? error.message : "Erro interno na busca global.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
