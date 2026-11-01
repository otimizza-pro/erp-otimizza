import { describe, it, expect } from "vitest";
import { query } from "@/lib/db/pool";

describe("Tuning e Otimização - Validação Automatizada em Banco Isolado", () => {
  describe("1. Consulta Real da Busca Global (Prevenção de Recorrência do Erro 500)", () => {
    it("executa as 7 consultas de busca global com parâmetros sem erros de colunas inexistentes", async () => {
      const searchPattern = "%EmpresaTeste%";

      // Executa exatamente as 7 consultas da busca global contra o schema real
      const [clientsRes, leadsRes, proposalsRes, contractsRes, recRes, payRes, projRes] =
        await Promise.all([
          // 1. Clientes: verifica name, trade_name, document
          query<{ id: string; name: string; document: string | null; status: string }>(
            `SELECT id, name, document, status
             FROM clients
             WHERE name ILIKE $1 OR trade_name ILIKE $1 OR document ILIKE $1
             ORDER BY name ASC
             LIMIT 5`,
            [searchPattern]
          ),

          // 2. Leads: verifica trade_name (evitando company_name inexistente)
          query<{ id: string; name: string; trade_name: string | null; status: string }>(
            `SELECT id, name, trade_name, status
             FROM crm_leads
             WHERE name ILIKE $1 OR trade_name ILIKE $1 OR email ILIKE $1 OR document ILIKE $1
             ORDER BY name ASC
             LIMIT 5`,
            [searchPattern]
          ),

          // 3. Propostas: verifica recipient resolvido via JOIN ou JSON snapshot
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

          // 4. Contratos: verifica join com clients
          query<{ id: string; contract_number: string; client_name: string; status: string }>(
            `SELECT c.id, c.contract_number, cl.name as client_name, c.status
             FROM contracts c
             JOIN clients cl ON cl.id = c.client_id
             WHERE c.contract_number ILIKE $1 OR cl.name ILIKE $1
             ORDER BY c.created_at DESC
             LIMIT 5`,
            [searchPattern]
          ),

          // 5. Contas a Receber: verifica receivable_number e original_amount
          query<{ id: string; receivable_number: string; description: string; original_amount: number; status: string }>(
            `SELECT id, receivable_number, description, original_amount, status
             FROM receivables
             WHERE receivable_number ILIKE $1 OR description ILIKE $1
             ORDER BY due_date DESC
             LIMIT 5`,
            [searchPattern]
          ),

          // 6. Contas a Pagar: verifica payable_number e supplier_name
          query<{ id: string; payable_number: string; description: string; supplier_name: string; status: string }>(
            `SELECT id, payable_number, description, supplier_name, status
             FROM payables
             WHERE payable_number ILIKE $1 OR description ILIKE $1 OR supplier_name ILIKE $1
             ORDER BY due_date DESC
             LIMIT 5`,
            [searchPattern]
          ),

          // 7. Projetos: verifica project_number as project_code (evitando project_code inexistente na tabela)
          query<{ id: string; project_code: string; name: string; status: string }>(
            `SELECT id, project_number as project_code, name, status
             FROM projects
             WHERE project_number ILIKE $1 OR name ILIKE $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [searchPattern]
          ),
        ]);

      expect(Array.isArray(clientsRes.rows)).toBe(true);
      expect(Array.isArray(leadsRes.rows)).toBe(true);
      expect(Array.isArray(proposalsRes.rows)).toBe(true);
      expect(Array.isArray(contractsRes.rows)).toBe(true);
      expect(Array.isArray(recRes.rows)).toBe(true);
      expect(Array.isArray(payRes.rows)).toBe(true);
      expect(Array.isArray(projRes.rows)).toBe(true);
    });
  });

  describe("2. Contadores do Dashboard com COUNT(*) OVER()", () => {
    it("retorna 0 quando não há registros correspondentes sem lançar exceção", async () => {
      // Query simulando filtro sem resultados (ID inexistente)
      const res = await query<{ id: string; total_count: number }>(
        `SELECT id, COUNT(*) OVER()::int as total_count
         FROM clients
         WHERE id = '00000000-0000-0000-0000-000000000000'
         LIMIT 6`
      );

      // Com 0 linhas correspondentes, a consulta retorna 0 linhas
      expect(res.rows.length).toBe(0);

      // A expressão segura de acesso deve avaliar para 0
      const safeCount = res.rows[0]?.total_count ?? 0;
      expect(safeCount).toBe(0);
    });

    it("preserva o contador total correto com mais de seis registros mesmo com LIMIT 6", async () => {
      // Gera virtualmente 10 registros com generate_series e aplica COUNT(*) OVER() com LIMIT 6
      const res = await query<{ item_number: number; total_count: number }>(
        `SELECT s as item_number, COUNT(*) OVER()::int as total_count
         FROM generate_series(1, 10) s
         ORDER BY s ASC
         LIMIT 6`
      );

      // O conjunto retornado pelo LIMIT 6 deve conter exatamente 6 linhas
      expect(res.rows.length).toBe(6);

      // Mas o total_count calculado pela Window Function COUNT(*) OVER() deve preservar o total de 10
      const totalCount = res.rows[0]?.total_count ?? 0;
      expect(totalCount).toBe(10);
      expect(res.rows[5].total_count).toBe(10);
    });

    it("valida a query real de action-items para atividades comerciais e projetos", async () => {
      const [actRes, projRes] = await Promise.all([
        query<{ id: string; total_count: number }>(
          `SELECT a.id,
                  COUNT(*) OVER()::int as total_count
           FROM crm_activities a
           WHERE a.status = 'PENDING'
             AND a.due_date <= (CURRENT_DATE + INTERVAL '1 day')
           ORDER BY a.due_date ASC
           LIMIT 6`
        ),
        query<{ id: string; total_count: number }>(
          `SELECT p.id,
                  COUNT(*) OVER()::int as total_count
           FROM projects p
           WHERE p.status NOT IN ('COMPLETED', 'CANCELED')
             AND p.due_date IS NOT NULL
             AND p.due_date <= (CURRENT_DATE + INTERVAL '7 days')
           ORDER BY p.due_date ASC
           LIMIT 6`
        ),
      ]);

      const actTotal = actRes.rows[0]?.total_count ?? 0;
      const projTotal = projRes.rows[0]?.total_count ?? 0;

      expect(typeof actTotal).toBe("number");
      expect(actTotal >= actRes.rows.length).toBe(true);

      expect(typeof projTotal).toBe("number");
      expect(projTotal >= projRes.rows.length).toBe(true);
    });
  });

  describe("3. Comportamento de Paralelização Concorrente com Promise.all", () => {
    it("executa múltiplas consultas concorrentes no pool sem esgotamento de conexões", async () => {
      const start = Date.now();
      const results = await Promise.all([
        query("SELECT 1 as num"),
        query("SELECT 2 as num"),
        query("SELECT 3 as num"),
        query("SELECT 4 as num"),
      ]);
      const duration = Date.now() - start;

      expect(results.length).toBe(4);
      expect(results[0].rows[0].num).toBe(1);
      expect(results[3].rows[0].num).toBe(4);
      expect(duration).toBeLessThan(10000);
    });
  });
});
