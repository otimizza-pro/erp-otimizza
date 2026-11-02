import { query, withTransaction, getDbPool, KNOWN_PRODUCTION_PROJECT_REF, extractProjectRef } from "../src/lib/db/pool";
import { getEnv } from "../src/lib/env";
import { cleanupSimulationData, SIMULATION_BATCH_ID, BATCH_TAG } from "./cleanup-simulation";
import { calculateEffectiveDueDate } from "../src/shared/recurrence";

// Pseudo-Random Number Generator determinístico para reprodutibilidade
class SeededRNG {
  private m = 0x80000000; // 2**31
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed = 42) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextInt(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }

  nextFloat(): number {
    return this.nextInt() / (this.m - 1);
  }

  range(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.nextFloat() * arr.length)];
  }
}

const rng = new SeededRNG(20261102);

function generateCnpj(index: number): string {
  const root = String(10000000 + index).padStart(8, "0");
  return `${root}0001${String(10 + (index % 89))}`;
}

function generatePhone(index: number): string {
  const num = String(90000000 + (index % 10000000)).padStart(8, "0");
  return `119${num.slice(1)}`;
}

// Helper para inserção em lote com parâmetros parametrizados e retorno de IDs
async function batchInsertValues(
  table: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 60,
  returning = "id"
): Promise<string[]> {
  const pool = getDbPool();
  const returnedIds: string[] = [];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valueClauses: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    for (const row of chunk) {
      const placeholders: string[] = [];
      for (const val of row) {
        placeholders.push(`$${pIdx++}`);
        params.push(val);
      }
      valueClauses.push(`(${placeholders.join(", ")})`);
    }

    const sql = `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES ${valueClauses.join(", ")}
      RETURNING ${returning}
    `;

    const res = await pool.query<{ [k: string]: string }>(sql, params);
    for (const r of res.rows) {
      returnedIds.push(r[returning]);
    }
  }

  return returnedIds;
}

export async function runOperationalSimulation() {
  const env = getEnv();
  const activeConn = process.env.NODE_ENV === "test" ? env.DATABASE_URL_TEST : env.DATABASE_URL;
  const projectRef = extractProjectRef(activeConn);

  console.log("================================================================================");
  console.log("🚀 INICIANDO SIMULAÇÃO OPERACIONAL COMPLETA - AGÊNCIA OTIMIZZA 2026 (ALTA VELOCIDADE)");
  console.log("================================================================================");
  console.log("• Data de Início Simulada: 01/01/2026");
  console.log("• Data de Corte Operacional: 02/11/2026");
  console.log("• Ambiente Conectado (Project Ref):", projectRef);
  console.log("• Identificador de Lote Sintético:", SIMULATION_BATCH_ID);
  console.log("--------------------------------------------------------------------------------");

  if (projectRef === KNOWN_PRODUCTION_PROJECT_REF) {
    throw new Error("🚨 PERIGO: Execução bloqueada! O banco conectado é a base de PRODUÇÃO.");
  }
  console.log("✅ AMBIENTE VALIDADO: Supabase Staging isolado (dzuftvgtimsyfjeyipgy).");

  // 1. Limpeza prévia do lote de simulação
  console.log("\n📦 PASSO 1: Garantir limpeza idempotente de execuções anteriores...");
  await cleanupSimulationData();

  // 2. Criação / Configuração de Contas Financeiras e Catálogo da Agência
  console.log("\n🏦 PASSO 2: Configurando Contas Bancárias e Catálogo Especializado...");

  // Contas Bancárias
  const itauRes = await query<{ id: string }>(
    `INSERT INTO financial_accounts (name, bank_name, account_type, initial_balance, current_balance)
     VALUES ($1, $2, 'CHECKING', 45000.00, 45000.00) RETURNING id`,
    [`Banco Itaú PJ - Agência Otimizza ${BATCH_TAG}`, "Banco Itaú Unibanco S.A."]
  );
  const accountItauId = itauRes.rows[0].id;

  const interRes = await query<{ id: string }>(
    `INSERT INTO financial_accounts (name, bank_name, account_type, initial_balance, current_balance)
     VALUES ($1, $2, 'INVESTMENT', 25000.00, 25000.00) RETURNING id`,
    [`Banco Inter PJ - Reserva & Rendimento ${BATCH_TAG}`, "Banco Inter S.A."]
  );
  const accountInterId = interRes.rows[0].id;

  // Centros de Custo
  const { rows: ccs } = await query<{ id: string; code: string }>("SELECT id, code FROM cost_centers");
  const ccOps = ccs.find((c) => c.code === "OPS")?.id || ccs[0].id;
  const ccAdm = ccs.find((c) => c.code === "ADM")?.id || ccs[0].id;
  const ccCom = ccs.find((c) => c.code === "COM")?.id || ccs[0].id;
  const ccTec = ccs.find((c) => c.code === "TEC")?.id || ccs[0].id;

  // Categorias
  const { rows: cats } = await query<{ id: string; name: string; type: string }>("SELECT id, name, type FROM financial_categories");
  const catIncome = cats.find((c) => c.type === "INCOME")?.id || cats[0].id;
  const catExpense = cats.find((c) => c.type === "EXPENSE")?.id || cats[0].id;

  // Serviços especializados no Catálogo
  const serviceDefs = [
    { name: "Gestão de Tráfego Meta Ads (E-commerce)", price: 1500.0, cost: 350.0, unit: "MES" },
    { name: "Gestão de Tráfego Google Ads (E-commerce)", price: 1500.0, cost: 350.0, unit: "MES" },
    { name: "Gestão Integrada Performance (Meta + Google Ads)", price: 2600.0, cost: 600.0, unit: "MES" },
    { name: "Consultoria & CRO para Lojas Virtuais", price: 1200.0, cost: 250.0, unit: "MES" },
    { name: "Setup Avançado Web Analytics & CAPI", price: 1200.0, cost: 200.0, unit: "PROJETO" },
    { name: "Criação de Landing Page de Alta Conversão", price: 2200.0, cost: 550.0, unit: "PROJETO" },
    { name: "Pack Mensal de Criativos Motion", price: 900.0, cost: 300.0, unit: "MES" },
    { name: "Auditoria de Performance & Tracking", price: 850.0, cost: 150.0, unit: "PROJETO" },
  ];

  const createdServices: Record<string, { id: string; name: string; price: number; cost: number; unit: string }> = {};
  for (const s of serviceDefs) {
    const res = await query<{ id: string }>(
      `INSERT INTO services (name, description, default_price, default_cost, billing_unit, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING id`,
      [s.name, `Serviço especializado ${BATCH_TAG}`, s.price, s.cost, s.unit]
    );
    createdServices[s.name] = { id: res.rows[0].id, name: s.name, price: s.price, cost: s.cost, unit: s.unit };
  }

  // Combos
  const cmb1Res = await query<{ id: string }>(
    `INSERT INTO combos (name, description, total_price, status)
     VALUES ($1, $2, 3800.00, 'ACTIVE') RETURNING id`,
    ["Combo Performance Total E-commerce", `Combo multicanal ${BATCH_TAG}`]
  );
  await query(
    `INSERT INTO combo_items (combo_id, service_id, component_price) VALUES 
     ($1, $2, 1400.00), ($1, $3, 1400.00), ($1, $4, 1000.00)`,
    [
      cmb1Res.rows[0].id,
      createdServices["Gestão de Tráfego Meta Ads (E-commerce)"].id,
      createdServices["Gestão de Tráfego Google Ads (E-commerce)"].id,
      createdServices["Setup Avançado Web Analytics & CAPI"].id,
    ]
  );

  const cmb2Res = await query<{ id: string }>(
    `INSERT INTO combos (name, description, total_price, status)
     VALUES ($1, $2, 2200.00, 'ACTIVE') RETURNING id`,
    ["Combo Escala Rápida", `Meta Ads + Criativos ${BATCH_TAG}`]
  );
  await query(
    `INSERT INTO combo_items (combo_id, service_id, component_price) VALUES 
     ($1, $2, 1400.00), ($1, $3, 800.00)`,
    [
      cmb2Res.rows[0].id,
      createdServices["Gestão de Tráfego Meta Ads (E-commerce)"].id,
      createdServices["Pack Mensal de Criativos Motion"].id,
    ]
  );

  // Fornecedores
  const suppliersData = [
    { name: "PixelMotion Studios Ltda", trade: `PixelMotion Criativos ${BATCH_TAG}`, doc: "22333444000155" },
    { name: "CloudStack Infra & Tracking Inc.", trade: `CloudStack CAPI ${BATCH_TAG}`, doc: "33444555000166" },
    { name: "CopyMaster Redação Publicitária ME", trade: `CopyMaster Copywriters ${BATCH_TAG}`, doc: "44555666000177" },
    { name: "Coworking Faria Lima Gestão Imobiliária", trade: `Coworking Sede ${BATCH_TAG}`, doc: "55666777000188" },
    { name: "Assessoria Contábil Otimizza Pro", trade: `Contabilidade Fixa ${BATCH_TAG}`, doc: "66777888000199" },
  ];

  const createdSuppliers: Array<{ id: string; name: string }> = [];
  for (const sup of suppliersData) {
    const res = await query<{ id: string }>(
      `INSERT INTO suppliers (name, trade_name, document, person_type, status)
       VALUES ($1, $2, $3, 'PJ', 'ACTIVE') RETURNING id`,
      [sup.name, sup.trade, sup.doc]
    );
    createdSuppliers.push({ id: res.rows[0].id, name: sup.name });
  }

  // Pipeline Padrão e Etapas
  const pipeRes = await query<{ id: string }>(
    `SELECT id FROM crm_pipelines WHERE name ILIKE '%Padrão%' OR is_default = true ORDER BY created_at ASC LIMIT 1`
  );
  const pipelineId = pipeRes.rows[0].id;

  const { rows: pipeStages } = await query<{ id: string; name: string; display_order: number; stage_type: string }>(
    `SELECT id, name, display_order, stage_type FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order ASC`,
    [pipelineId]
  );

  const stage1 = pipeStages.find((s) => s.display_order === 1) || pipeStages[0];
  const stage2 = pipeStages.find((s) => s.display_order === 2) || pipeStages[1];
  const stage3 = pipeStages.find((s) => s.display_order === 3) || pipeStages[2];
  const stage4 = pipeStages.find((s) => s.display_order === 4) || pipeStages[3];
  const stageWon = pipeStages.find((s) => s.stage_type === "WON") || pipeStages[pipeStages.length - 2];
  const stageLost = pipeStages.find((s) => s.stage_type === "LOST") || pipeStages[pipeStages.length - 1];

  // Template de Projetos
  const tmplRes = await query<{ id: string }>(
    `SELECT id FROM project_templates WHERE code = 'TMPL-TRAFEGO' LIMIT 1`
  );
  const tmplTrafegoId = tmplRes.rows[0]?.id;

  // 3. Distribuição Temporal de Leads (680 leads)
  console.log("\n👥 PASSO 3: Gerando 680 Leads distribuídos mensalmente...");

  const monthsDistribution = [
    { month: "2026-01", count: 45, days: 31 },
    { month: "2026-02", count: 48, days: 28 },
    { month: "2026-03", count: 54, days: 31 },
    { month: "2026-04", count: 58, days: 30 },
    { month: "2026-05", count: 62, days: 31 },
    { month: "2026-06", count: 68, days: 30 },
    { month: "2026-07", count: 74, days: 31 },
    { month: "2026-08", count: 80, days: 31 },
    { month: "2026-09", count: 85, days: 30 },
    { month: "2026-10", count: 88, days: 31 },
    { month: "2026-11", count: 18, days: 2 }, // até 02/11/2026
  ];

  const niches = [
    "Moda & Vestuário E-commerce",
    "Cosméticos & Beleza Online",
    "Eletrônicos & Smart Home",
    "Casa, Decoração & Móveis",
    "Suplementos & Nutrição",
    "Calçados & Bolsas",
    "Alimentos & Bebidas Artesanais",
    "Joias & Semi-joias",
    "Pet Shop & Acessórios Pet",
    "Infantil & Brinquedos",
  ];

  const companyPrefixes = [
    "Aurora", "Lumina", "Veloce", "BioNutri", "Zenith", "Aroma", "UrbanDrop", "BellaDonna",
    "TechPrime", "CasaVerde", "Vitalis", "EstiloNobre", "PulseFit", "NovaFlora", "PuraVida",
    "OptimaStore", "ModaViva", "GourmetClub", "SmartPet", "EliteWear", "PureSilk", "MaxPower",
  ];

  const sources = [
    "GOOGLE_ADS", "GOOGLE_ADS", "GOOGLE_ADS",
    "META_ADS", "META_ADS", "META_ADS",
    "INDICACAO", "INDICACAO",
    "INBOUND_ORGANICO",
    "OUTBOUND",
  ];

  interface SimLead {
    idx: number;
    code: string;
    name: string;
    tradeName: string;
    document: string;
    email: string;
    phone: string;
    segment: string;
    source: string;
    status: string;
    dateStr: string;
    month: string;
    id?: string;
  }

  const allLeads: SimLead[] = [];
  let gLeadIdx = 0;

  for (const m of monthsDistribution) {
    for (let i = 0; i < m.count; i++) {
      gLeadIdx++;
      const day = rng.range(1, m.days);
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${m.month}-${dayStr}`;

      const prefix = rng.pick(companyPrefixes);
      const niche = rng.pick(niches);
      const companyName = `${prefix} ${niche.split(" ")[0]} Ltda`;
      const tradeName = `${prefix} ${niche.split(" ")[0]}`;
      const doc = generateCnpj(gLeadIdx);
      const email = `contato@${prefix.toLowerCase()}${gLeadIdx}.exemplo-loja.com.br`;
      const phone = generatePhone(gLeadIdx);
      const source = rng.pick(sources);

      let status = "QUALIFIED";
      const isRecent = m.month === "2026-10" || m.month === "2026-11";
      const roll = rng.nextFloat();

      if (isRecent) {
        if (roll < 0.25) status = "NEW";
        else if (roll < 0.45) status = "CONTACTED";
        else if (roll < 0.55) status = "UNQUALIFIED";
        else status = "QUALIFIED";
      } else {
        if (roll < 0.08) status = "UNQUALIFIED";
        else if (roll < 0.12) status = "ARCHIVED";
        else status = "QUALIFIED";
      }

      allLeads.push({
        idx: gLeadIdx,
        code: `LEAD-SIM-${String(gLeadIdx).padStart(5, "0")}`,
        name: companyName,
        tradeName,
        document: doc,
        email,
        phone,
        segment: niche,
        source,
        status,
        dateStr,
        month: m.month,
      });
    }
  }

  // Inserção em lote de Leads
  const leadRows = allLeads.map((l) => [
    l.code,
    "PJ",
    l.name,
    l.tradeName,
    l.document,
    l.email,
    l.phone,
    l.segment,
    l.source,
    l.status,
    `Lead de simulação ${BATCH_TAG}`,
    `${l.dateStr} 10:00:00+00`,
    `${l.dateStr} 10:00:00+00`,
  ]);

  const leadIds = await batchInsertValues(
    "crm_leads",
    [
      "lead_code", "person_type", "name", "trade_name", "document", "email", "phone",
      "segment", "source", "status", "notes", "created_at", "updated_at",
    ],
    leadRows
  );

  for (let i = 0; i < allLeads.length; i++) {
    allLeads[i].id = leadIds[i];
  }
  console.log(`✅ ${allLeads.length} Leads inseridos em lote com sucesso.`);

  // 4. Oportunidades no CRM
  console.log("\n🎯 PASSO 4: Criando Oportunidades no Funil Comercial...");

  const qualifiedLeads = allLeads.filter((l) => l.status === "QUALIFIED");

  interface SimOpp {
    oppIndex: number;
    code: string;
    leadId: string;
    leadIndex: number;
    title: string;
    amount: number;
    billingPeriod: "MONTHLY" | "YEARLY" | "ONE_TIME";
    normalizedMonthly: number;
    stageId: string;
    status: "OPEN" | "WON" | "LOST";
    lostReason?: string;
    probability: number;
    createdDate: string;
    closedDate?: string;
    servicesToContract: Array<{ serviceName: string; periodicity: "MONTHLY" | "YEARLY" | "ONE_TIME"; price: number }>;
    comboName?: string;
    id?: string;
  }

  const allOpps: SimOpp[] = [];
  let oppCounter = 0;

  for (const ld of qualifiedLeads) {
    oppCounter++;
    const d = new Date(`${ld.dateStr}T10:00:00Z`);
    d.setDate(d.getDate() + rng.range(1, 3));
    const oppDateStr = d.toISOString().slice(0, 10);

    const serviceChoice = rng.range(1, 6);
    let title = "";
    let amount = 1500.0;
    let billingPeriod: "MONTHLY" | "YEARLY" | "ONE_TIME" = "MONTHLY";
    let normalizedMonthly = 1500.0;
    let servicesToContract: SimOpp["servicesToContract"] = [];
    let comboName: string | undefined = undefined;

    if (serviceChoice === 1) {
      title = `Gestão Meta Ads - ${ld.tradeName}`;
      amount = 1500.0;
      normalizedMonthly = 1500.0;
      servicesToContract = [{ serviceName: "Gestão de Tráfego Meta Ads (E-commerce)", periodicity: "MONTHLY", price: 1500.0 }];
    } else if (serviceChoice === 2) {
      title = `Gestão Google Ads - ${ld.tradeName}`;
      amount = 1500.0;
      normalizedMonthly = 1500.0;
      servicesToContract = [{ serviceName: "Gestão de Tráfego Google Ads (E-commerce)", periodicity: "MONTHLY", price: 1500.0 }];
    } else if (serviceChoice === 3) {
      title = `Combo Performance Total - ${ld.tradeName}`;
      amount = 3800.0;
      comboName = "Combo Performance Total E-commerce";
      normalizedMonthly = 2800.0;
      servicesToContract = [
        { serviceName: "Gestão de Tráfego Meta Ads (E-commerce)", periodicity: "MONTHLY", price: 1400.0 },
        { serviceName: "Gestão de Tráfego Google Ads (E-commerce)", periodicity: "MONTHLY", price: 1400.0 },
        { serviceName: "Setup Avançado Web Analytics & CAPI", periodicity: "ONE_TIME", price: 1000.0 },
      ];
    } else if (serviceChoice === 4) {
      title = `Gestão Integrada Performance - ${ld.tradeName}`;
      amount = 2600.0;
      normalizedMonthly = 2600.0;
      servicesToContract = [{ serviceName: "Gestão Integrada Performance (Meta + Google Ads)", periodicity: "MONTHLY", price: 2600.0 }];
    } else if (serviceChoice === 5) {
      title = `Plano Anual Fidelidade Performance - ${ld.tradeName}`;
      amount = 28800.0;
      billingPeriod = "YEARLY";
      normalizedMonthly = 2400.0;
      servicesToContract = [{ serviceName: "Gestão Integrada Performance (Meta + Google Ads)", periodicity: "YEARLY", price: 28800.0 }];
    } else {
      title = `Setup GA4 & CAPI - ${ld.tradeName}`;
      amount = 1200.0;
      billingPeriod = "ONE_TIME";
      normalizedMonthly = 0.0;
      servicesToContract = [{ serviceName: "Setup Avançado Web Analytics & CAPI", periodicity: "ONE_TIME", price: 1200.0 }];
    }

    let stageId = stageWon.id;
    let status: "OPEN" | "WON" | "LOST" = "WON";
    let lostReason: string | undefined = undefined;
    let prob = 100;
    let closedDateStr: string | undefined = undefined;

    const isLate2026 = ld.month === "2026-10" || ld.month === "2026-11";
    const roll = rng.nextFloat();

    if (isLate2026) {
      if (roll < 0.25) {
        stageId = stage1.id;
        status = "OPEN";
        prob = 20;
      } else if (roll < 0.50) {
        stageId = stage2.id;
        status = "OPEN";
        prob = 40;
      } else if (roll < 0.70) {
        stageId = stage3.id;
        status = "OPEN";
        prob = 60;
      } else if (roll < 0.82) {
        stageId = stage4.id;
        status = "OPEN";
        prob = 80;
      } else if (roll < 0.90) {
        stageId = stageLost.id;
        status = "LOST";
        prob = 0;
        lostReason = "Orçamento de mídia insuficiente para o fee da agência";
        const cDate = new Date(`${oppDateStr}T14:00:00Z`);
        cDate.setDate(cDate.getDate() + rng.range(5, 10));
        closedDateStr = cDate.toISOString().slice(0, 10);
        if (closedDateStr > "2026-11-02") closedDateStr = "2026-11-02";
      } else {
        stageId = stageWon.id;
        status = "WON";
        prob = 100;
        const cDate = new Date(`${oppDateStr}T14:00:00Z`);
        cDate.setDate(cDate.getDate() + rng.range(6, 12));
        closedDateStr = cDate.toISOString().slice(0, 10);
        if (closedDateStr > "2026-11-02") closedDateStr = "2026-11-02";
      }
    } else {
      if (roll < 0.32) {
        stageId = stageLost.id;
        status = "LOST";
        prob = 0;
        lostReason = rng.pick([
          "Orçamento de mídia insuficiente para o fee da agência",
          "Decidiu manter a operação de tráfego internamente",
          "Falta de faturamento mínimo no e-commerce para ROI positivo",
          "Priorizou investimento em estoque no momento",
          "Optou por concorrente com preço inferior",
        ]);
        const cDate = new Date(`${oppDateStr}T14:00:00Z`);
        cDate.setDate(cDate.getDate() + rng.range(7, 16));
        closedDateStr = cDate.toISOString().slice(0, 10);
      } else {
        stageId = stageWon.id;
        status = "WON";
        prob = 100;
        const cDate = new Date(`${oppDateStr}T14:00:00Z`);
        cDate.setDate(cDate.getDate() + rng.range(8, 18));
        closedDateStr = cDate.toISOString().slice(0, 10);
      }
    }

    allOpps.push({
      oppIndex: oppCounter,
      code: `OPP-SIM-${String(oppCounter).padStart(5, "0")}`,
      leadId: ld.id!,
      leadIndex: ld.idx,
      title,
      amount,
      billingPeriod,
      normalizedMonthly,
      stageId,
      status,
      lostReason,
      probability: prob,
      createdDate: oppDateStr,
      closedDate: closedDateStr,
      servicesToContract,
      comboName,
    });
  }

  // Inserção em lote de Oportunidades
  const oppRows = allOpps.map((op) => {
    const expClose = new Date(`${op.createdDate}T12:00:00Z`);
    expClose.setDate(expClose.getDate() + 20);
    return [
      op.code,
      op.title,
      op.leadId,
      pipelineId,
      op.stageId,
      op.amount,
      op.billingPeriod,
      op.probability,
      op.normalizedMonthly,
      op.status,
      op.lostReason || null,
      `Oportunidade simulada ${BATCH_TAG}`,
      expClose.toISOString().slice(0, 10),
      op.closedDate ? `${op.closedDate} 15:00:00+00` : null,
      `${op.createdDate} 11:00:00+00`,
      `${op.createdDate} 11:00:00+00`,
    ];
  });

  const oppIds = await batchInsertValues(
    "crm_opportunities",
    [
      "opportunity_code", "title", "lead_id", "pipeline_id", "stage_id",
      "amount", "billing_period", "probability", "normalized_monthly_value",
      "status", "lost_reason", "notes", "expected_close_date", "closed_at",
      "created_at", "updated_at",
    ],
    oppRows
  );

  for (let i = 0; i < allOpps.length; i++) {
    allOpps[i].id = oppIds[i];
  }
  console.log(`✅ ${allOpps.length} Oportunidades inseridas em lote no CRM.`);

  // 5. Clientes, Propostas e Contratações
  console.log("\n📄 PASSO 5: Convertendo Leads em Clientes e Fechando Contratações...");

  const wonOpps = allOpps.filter((o) => o.status === "WON");
  console.log(`• Oportunidades ganhas a converter: ${wonOpps.length}`);

  // Mapear leads únicos para clientes únicos
  const distinctWonLeads = Array.from(new Set(wonOpps.map((o) => o.leadId))).map(
    (leadId) => allLeads.find((l) => l.id === leadId)!
  );

  // Inserção em lote de Clientes
  const clientRows = distinctWonLeads.map((l) => [
    "PJ",
    l.name,
    l.tradeName,
    l.document,
    l.email,
    l.phone,
    "ACTIVE",
    `Cliente convertido da simulação ${BATCH_TAG}`,
    `${l.dateStr} 15:00:00+00`,
    `${l.dateStr} 15:00:00+00`,
  ]);

  const clientIds = await batchInsertValues(
    "clients",
    [
      "type", "name", "trade_name", "document", "email", "phone",
      "status", "notes", "created_at", "updated_at",
    ],
    clientRows
  );

  const clientIdByLeadId = new Map<string, string>();
  for (let i = 0; i < distinctWonLeads.length; i++) {
    clientIdByLeadId.set(distinctWonLeads[i].id!, clientIds[i]);
  }

  // Atualizar crm_leads com converted_client_id em lotes rápidos
  for (let i = 0; i < distinctWonLeads.length; i += 50) {
    const chunkLeads = distinctWonLeads.slice(i, i + 50);
    const chunkClientIds = clientIds.slice(i, i + 50);
    const cases: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (let j = 0; j < chunkLeads.length; j++) {
      cases.push(`WHEN id = $${p++} THEN $${p++}::uuid`);
      params.push(chunkLeads[j].id, chunkClientIds[j]);
    }
    const leadIds = chunkLeads.map((l) => l.id);
    await query(
      `UPDATE crm_leads 
       SET status = 'CONVERTED', 
           converted_client_id = CASE ${cases.join(" ")} END
       WHERE id = ANY($${p}::uuid[])`,
      [...params, leadIds]
    );
  }
  console.log(`✅ ${clientIds.length} Clientes cadastrados e vinculados aos Leads.`);

  // Propostas Comerciais
  interface SimProposal {
    proposalCode: string;
    leadId: string;
    clientId: string;
    oppId: string;
    title: string;
    createdDate: string;
    approvalDate: string;
    subtotalOneTime: number;
    subtotalMonthly: number;
    subtotalYearly: number;
    estimatedCostOneTime: number;
    estimatedCostMonthly: number;
    estimatedCostYearly: number;
    servicesToContract: SimOpp["servicesToContract"];
    comboName?: string;
    hasMultipleVersions: boolean;
    proposalId?: string;
    approvedVersionId?: string;
  }

  const proposalsToInsert: SimProposal[] = [];
  let propNum = 0;

  for (const op of wonOpps) {
    propNum++;
    const propCode = `PROP-SIM-${String(propNum).padStart(5, "0")}`;
    const clientId = clientIdByLeadId.get(op.leadId)!;
    const approvalDate = op.closedDate || op.createdDate;
    const hasMultipleVersions = propNum % 7 === 0;

    let subOne = 0, subMon = 0, subYr = 0;
    let costOne = 0, costMon = 0, costYr = 0;

    for (const itm of op.servicesToContract) {
      const s = createdServices[itm.serviceName];
      if (itm.periodicity === "ONE_TIME") {
        subOne += itm.price;
        costOne += s.cost;
      } else if (itm.periodicity === "MONTHLY") {
        subMon += itm.price;
        costMon += s.cost;
      } else if (itm.periodicity === "YEARLY") {
        subYr += itm.price;
        costYr += s.cost * 12;
      }
    }

    proposalsToInsert.push({
      proposalCode: propCode,
      leadId: op.leadId,
      clientId,
      oppId: op.id!,
      title: `Proposta Comercial - ${op.title}`,
      createdDate: op.createdDate,
      approvalDate,
      subtotalOneTime: subOne,
      subtotalMonthly: subMon,
      subtotalYearly: subYr,
      estimatedCostOneTime: costOne,
      estimatedCostMonthly: costMon,
      estimatedCostYearly: costYr,
      servicesToContract: op.servicesToContract,
      comboName: op.comboName,
      hasMultipleVersions,
    });
  }

  // Inserir cabeçalhos de propostas em lote
  const propRows = proposalsToInsert.map((p) => [
    p.proposalCode,
    p.title,
    p.leadId,
    p.clientId,
    p.oppId,
    "APPROVED",
    p.hasMultipleVersions ? 2 : 1,
    p.hasMultipleVersions ? 2 : 1,
    `${p.approvalDate} 16:00:00+00`,
    `Aprovado em negociação ${BATCH_TAG}`,
    "2026-12-31",
    `${p.createdDate} 10:00:00+00`,
    `${p.approvalDate} 16:00:00+00`,
  ]);

  const insertedPropIds = await batchInsertValues(
    "proposals",
    [
      "proposal_code", "title", "lead_id", "client_id", "opportunity_id",
      "status", "current_version_number", "approved_version_number",
      "approved_at", "approval_notes", "valid_until", "created_at", "updated_at",
    ],
    propRows
  );

  for (let i = 0; i < proposalsToInsert.length; i++) {
    proposalsToInsert[i].proposalId = insertedPropIds[i];
  }

  // Inserir Versões das Propostas
  const versionRows: unknown[][] = [];
  const versionMeta: Array<{ propIdx: number; isApproved: boolean }> = [];

  for (let i = 0; i < proposalsToInsert.length; i++) {
    const p = proposalsToInsert[i];

    if (p.hasMultipleVersions) {
      // v1 SUPERSEDED
      versionRows.push([
        p.proposalId,
        1,
        "SUPERSEDED",
        p.subtotalOneTime + 200,
        p.subtotalMonthly + 300,
        p.subtotalYearly,
        0,
        p.subtotalOneTime + 200,
        p.subtotalMonthly + 300,
        p.subtotalYearly,
        p.estimatedCostOneTime,
        p.estimatedCostMonthly,
        p.estimatedCostYearly,
        `${p.createdDate} 10:00:00+00`,
        null,
      ]);
      versionMeta.push({ propIdx: i, isApproved: false });
    }

    // v_approved
    versionRows.push([
      p.proposalId,
      p.hasMultipleVersions ? 2 : 1,
      "APPROVED",
      p.subtotalOneTime,
      p.subtotalMonthly,
      p.subtotalYearly,
      0,
      p.subtotalOneTime,
      p.subtotalMonthly,
      p.subtotalYearly,
      p.estimatedCostOneTime,
      p.estimatedCostMonthly,
      p.estimatedCostYearly,
      `${p.approvalDate} 10:00:00+00`,
      `${p.approvalDate} 16:00:00+00`,
    ]);
    versionMeta.push({ propIdx: i, isApproved: true });
  }

  const insertedVerIds = await batchInsertValues(
    "proposal_versions",
    [
      "proposal_id", "version_number", "version_status",
      "subtotal_one_time", "subtotal_monthly", "subtotal_yearly", "discount_total",
      "total_one_time_effective", "total_monthly_effective", "total_yearly_effective",
      "estimated_one_time_cost", "estimated_monthly_cost", "estimated_yearly_cost",
      "created_at", "approved_at",
    ],
    versionRows
  );

  for (let k = 0; k < versionMeta.length; k++) {
    if (versionMeta[k].isApproved) {
      proposalsToInsert[versionMeta[k].propIdx].approvedVersionId = insertedVerIds[k];
    }
  }

  // Itens das Propostas Aprovadas
  const propItemRows: unknown[][] = [];
  for (const p of proposalsToInsert) {
    for (const itm of p.servicesToContract) {
      const s = createdServices[itm.serviceName];
      propItemRows.push([
        p.approvedVersionId,
        p.comboName ? "COMBO" : "SERVICE",
        s.id,
        s.name,
        p.comboName || null,
        itm.periodicity,
        1,
        itm.price,
        itm.price,
        itm.price,
        s.cost,
        s.cost,
        `${p.approvalDate} 10:00:00+00`,
      ]);
    }
  }

  await batchInsertValues(
    "proposal_items",
    [
      "proposal_version_id", "source_type", "service_id", "service_name",
      "combo_name", "periodicity", "quantity", "reference_unit_price", "negotiated_unit_price",
      "total_amount", "unit_cost", "total_cost", "created_at",
    ],
    propItemRows
  );
  console.log(`✅ ${proposalsToInsert.length} Propostas criadas com snapshots imutáveis e versionamento.`);

  // Contratos Gerados a partir das Propostas Aprovadas
  interface SimContract {
    contractNumber: string;
    clientId: string;
    proposalId: string;
    proposalCode: string;
    status: string;
    billingPeriod: "MONTHLY" | "YEARLY" | "ONE_TIME";
    totalAmount: number;
    dueDay: number;
    startDate: string;
    canceledDate?: string;
    cancellationReason?: string;
    isCanceled: boolean;
    isEnded: boolean;
    items: Array<{ serviceName: string; price: number; periodicity: string }>;
    contractId?: string;
    versionId?: string;
  }

  const contractsToInsert: SimContract[] = [];
  let contractCounter = 0;

  for (const p of proposalsToInsert) {
    const periodicities = Array.from(new Set(p.servicesToContract.map((i) => i.periodicity)));

    for (const per of periodicities) {
      contractCounter++;
      const ctrNum = `CTR-SIM-${String(contractCounter).padStart(5, "0")}`;
      const itemsOfPer = p.servicesToContract.filter((i) => i.periodicity === per);
      const perTotal = itemsOfPer.reduce((sum, i) => sum + i.price, 0);
      const dueDay = rng.pick([5, 10, 15, 20, 25]);
      const startDate = p.approvalDate;

      let isCanceled = false;
      let canceledDate: string | undefined = undefined;
      let cancellationReason: string | undefined = undefined;
      const isEnded = per === "ONE_TIME";

      if (per === "MONTHLY" && startDate < "2026-06-01") {
        if (rng.nextFloat() < 0.20) {
          isCanceled = true;
          const cD = new Date(`${startDate}T00:00:00Z`);
          cD.setMonth(cD.getMonth() + rng.range(2, 5));
          canceledDate = cD.toISOString().slice(0, 10);
          if (canceledDate > "2026-10-31") canceledDate = "2026-10-31";
          cancellationReason = "Redução temporária de investimento no e-commerce";
        }
      }

      const status = isCanceled ? "CANCELED" : isEnded ? "ENDED" : "ACTIVE";

      contractsToInsert.push({
        contractNumber: ctrNum,
        clientId: p.clientId,
        proposalId: p.proposalId!,
        proposalCode: p.proposalCode,
        status,
        billingPeriod: per as "MONTHLY" | "YEARLY" | "ONE_TIME",
        totalAmount: perTotal,
        dueDay,
        startDate,
        canceledDate,
        cancellationReason,
        isCanceled,
        isEnded,
        items: itemsOfPer,
      });
    }
  }

  // Inserir Contratos em Lote
  const ctrRows = contractsToInsert.map((c) => [
    c.clientId,
    c.contractNumber,
    c.status,
    c.cancellationReason || null,
    c.canceledDate ? `${c.canceledDate} 18:00:00+00` : null,
    c.proposalId,
    c.proposalCode,
    `${c.startDate} 17:00:00+00`,
    c.canceledDate ? `${c.canceledDate} 18:00:00+00` : `${c.startDate} 17:00:00+00`,
  ]);

  const insertedCtrIds = await batchInsertValues(
    "contracts",
    [
      "client_id", "contract_number", "status", "cancellation_reason", "canceled_at",
      "proposal_id", "proposal_code", "created_at", "updated_at",
    ],
    ctrRows
  );

  for (let i = 0; i < contractsToInsert.length; i++) {
    contractsToInsert[i].contractId = insertedCtrIds[i];
  }

  // Inserir Versões de Contratos em Lote
  const cvRows = contractsToInsert.map((c) => [
    c.contractId,
    1,
    `Vigência Operacional (${c.contractNumber})`,
    c.billingPeriod,
    c.dueDay,
    c.startDate,
    c.isEnded ? c.startDate : null,
    !c.isEnded,
    c.startDate,
    c.totalAmount,
    `Versão contratada ${BATCH_TAG}`,
    `${c.startDate} 17:00:00+00`,
  ]);

  const insertedCvIds = await batchInsertValues(
    "contract_versions",
    [
      "contract_id", "version_number", "title", "billing_period", "due_day",
      "start_date", "end_date", "is_indefinite", "effective_date", "total_amount",
      "notes", "created_at",
    ],
    cvRows
  );

  for (let i = 0; i < contractsToInsert.length; i++) {
    contractsToInsert[i].versionId = insertedCvIds[i];
  }

  // Inserir Itens de Contrato em Lote
  const ciRows: unknown[][] = [];
  for (const c of contractsToInsert) {
    for (const itm of c.items) {
      const s = createdServices[itm.serviceName];
      ciRows.push([
        c.versionId,
        s.id,
        s.name,
        1,
        itm.price,
        s.cost,
        itm.price,
        `${c.startDate} 17:00:00+00`,
      ]);
    }
  }

  await batchInsertValues(
    "contract_items",
    [
      "contract_version_id", "service_id", "service_name", "quantity",
      "unit_price", "unit_cost", "total_price", "created_at",
    ],
    ciRows
  );

  // Inserir Conversões Idempotentes
  const convRows = contractsToInsert.map((c) => [
    c.proposalId,
    proposalsToInsert.find((p) => p.proposalId === c.proposalId)!.approvedVersionId,
    c.contractId,
    c.clientId,
    c.billingPeriod,
    `CONV-SIM-${c.proposalId}-${c.billingPeriod}`,
    `${c.startDate} 17:00:00+00`,
  ]);

  await batchInsertValues(
    "proposal_contract_conversions",
    [
      "proposal_id", "proposal_version_id", "contract_id", "converted_client_id",
      "periodicity", "idempotency_key", "created_at",
    ],
    convRows
  );
  console.log(`✅ ${contractsToInsert.length} Contratos criados com rastreabilidade.`);

  // 6. Projetos Operacionais Recorrentes e Avulsos
  console.log("\n🚀 PASSO 6: Gerando Projetos Operacionais e Recorrências de Entrega...");

  interface SimProject {
    projectNumber: string;
    name: string;
    projectType: "STANDALONE" | "RECURRING";
    clientId: string;
    contractId: string;
    contractVersionId: string;
    competency?: string;
    status: string;
    startDate: string;
    dueDate: string;
    budget: number;
    id?: string;
  }

  const projectsToInsert: SimProject[] = [];
  let projectCounter = 0;

  for (const c of contractsToInsert) {
    if (c.billingPeriod === "ONE_TIME") {
      projectCounter++;
      const pDue = new Date(`${c.startDate}T00:00:00Z`);
      pDue.setDate(pDue.getDate() + 30);
      const pDueStr = pDue.toISOString().slice(0, 10);
      const isPastCutoff = pDueStr <= "2026-11-02";

      projectsToInsert.push({
        projectNumber: `PRJ-SIM-${String(projectCounter).padStart(5, "0")}`,
        name: `Setup Operacional ${c.contractNumber}`,
        projectType: "STANDALONE",
        clientId: c.clientId,
        contractId: c.contractId!,
        contractVersionId: c.versionId!,
        status: isPastCutoff ? "COMPLETED" : "IN_PROGRESS",
        startDate: c.startDate,
        dueDate: pDueStr,
        budget: c.totalAmount,
      });
    } else {
      // Recorrente
      const startYM = c.startDate.slice(0, 7);
      const activeMonths = monthsDistribution
        .map((m) => m.month)
        .filter((m) => m >= startYM && (!c.isCanceled || (c.canceledDate && m <= c.canceledDate.slice(0, 7))));

      for (const comp of activeMonths) {
        projectCounter++;
        const pStart = `${comp}-01`;
        const pDue = `${comp}-28`;
        const isPastMonth = comp < "2026-11";

        projectsToInsert.push({
          projectNumber: `PRJ-SIM-${String(projectCounter).padStart(5, "0")}`,
          name: `Gestão Mensal Tráfego ${comp} - ${c.contractNumber}`,
          projectType: "RECURRING",
          clientId: c.clientId,
          contractId: c.contractId!,
          contractVersionId: c.versionId!,
          competency: comp,
          status: isPastMonth ? "COMPLETED" : "IN_PROGRESS",
          startDate: pStart,
          dueDate: pDue,
          budget: c.billingPeriod === "YEARLY" ? c.totalAmount / 12 : c.totalAmount,
        });
      }
    }
  }

  // Inserir Projetos em Lote
  const prjRows = projectsToInsert.map((p) => [
    p.projectNumber,
    p.name,
    p.projectType,
    p.clientId,
    p.contractId,
    p.contractVersionId,
    tmplTrafegoId || null,
    p.competency || null,
    p.status,
    "MEDIUM",
    p.startDate,
    p.dueDate,
    p.status === "COMPLETED" ? `${p.dueDate} 18:00:00+00` : null,
    p.budget,
    `Projeto de simulação ${BATCH_TAG}`,
    `${p.startDate} 08:00:00+00`,
  ]);

  const insertedPrjIds = await batchInsertValues(
    "projects",
    [
      "project_number", "name", "project_type", "client_id", "contract_id", "contract_version_id",
      "template_id", "competency", "status", "priority", "start_date", "due_date", "completed_at",
      "estimated_budget", "notes", "created_at",
    ],
    prjRows
  );

  for (let i = 0; i < projectsToInsert.length; i++) {
    projectsToInsert[i].id = insertedPrjIds[i];
  }
  console.log(`✅ ${projectsToInsert.length} Projetos operacionais inseridos.`);

  // 7. Motor Financeiro: Contas a Receber e Baixas de Liquidação
  console.log("\n💰 PASSO 7: Gerando Contas a Receber e Liquidações de Caixa...");

  interface SimReceivable {
    recNum: string;
    clientId: string;
    contractId: string;
    contractVersionId: string;
    description: string;
    competency: string;
    dueDate: string;
    originalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    idempotencyKey: string;
    isSettled: boolean;
    settlementAmount: number;
    settlementDate?: string;
    accId?: string;
    id?: string;
  }

  const recsToInsert: SimReceivable[] = [];
  let recCounter = 0;

  for (const c of contractsToInsert) {
    const startYM = c.startDate.slice(0, 7);

    if (c.billingPeriod === "ONE_TIME") {
      recCounter++;
      const dueDate = c.startDate;
      const isPastCutoff = dueDate <= "2026-11-02";
      const amt = c.totalAmount;

      recsToInsert.push({
        recNum: `REC-SIM-${String(recCounter).padStart(5, "0")}`,
        clientId: c.clientId,
        contractId: c.contractId!,
        contractVersionId: c.versionId!,
        description: `Serviço Avulso Contrato ${c.contractNumber} ${BATCH_TAG}`,
        competency: startYM,
        dueDate,
        originalAmount: amt,
        paidAmount: isPastCutoff ? amt : 0.0,
        balanceAmount: isPastCutoff ? 0.0 : amt,
        status: isPastCutoff ? "PAID" : "PENDING",
        idempotencyKey: `REC_SIM_${c.contractId}_${startYM}`,
        isSettled: isPastCutoff,
        settlementAmount: amt,
        settlementDate: dueDate,
        accId: accountItauId,
      });
    } else {
      // Recorrente
      const activeMonths = monthsDistribution
        .map((m) => m.month)
        .filter((m) => m >= startYM && (!c.isCanceled || (c.canceledDate && m <= c.canceledDate.slice(0, 7))));

      for (const comp of activeMonths) {
        const [yStr, mStr] = comp.split("-");
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);

        if (c.billingPeriod === "YEARLY" && m !== parseInt(startYM.split("-")[1], 10)) {
          continue;
        }

        recCounter++;
        const effDueDate = calculateEffectiveDueDate(c.dueDay, y, m);
        const isPastCutoff = effDueDate <= "2026-11-02";
        const amt = c.totalAmount;

        let isSettled = false;
        let setAmt = 0;
        let setDate: string | undefined = undefined;
        let status = "PENDING";
        let paidAmt = 0;
        let balAmt = amt;

        if (isPastCutoff) {
          const roll = rng.nextFloat();
          if (roll < 0.88) {
            // Pago integralmente
            isSettled = true;
            setAmt = amt;
            status = "PAID";
            paidAmt = amt;
            balAmt = 0;
            const pD = new Date(`${effDueDate}T12:00:00Z`);
            pD.setDate(pD.getDate() + rng.range(-1, 2));
            setDate = pD.toISOString().slice(0, 10);
            if (setDate > "2026-11-02") setDate = "2026-11-02";
          } else if (roll < 0.94) {
            // Pago parcialmente
            isSettled = true;
            setAmt = Number((amt * 0.6).toFixed(2));
            status = "OVERDUE"; // vencido com saldo restante
            paidAmt = setAmt;
            balAmt = Number((amt - setAmt).toFixed(2));
            setDate = effDueDate;
          } else {
            // Totalmente em aberto / vencido
            status = "OVERDUE";
            paidAmt = 0;
            balAmt = amt;
          }
        } else {
          // Pós-data de corte: PENDING futuro
          status = "PENDING";
          paidAmt = 0;
          balAmt = amt;
        }

        recsToInsert.push({
          recNum: `REC-SIM-${String(recCounter).padStart(5, "0")}`,
          clientId: c.clientId,
          contractId: c.contractId!,
          contractVersionId: c.versionId!,
          description: `Mensalidade Tráfego ${comp} (${c.contractNumber}) ${BATCH_TAG}`,
          competency: comp,
          dueDate: effDueDate,
          originalAmount: amt,
          paidAmount: paidAmt,
          balanceAmount: balAmt,
          status,
          idempotencyKey: `REC_SIM_${c.contractId}_${comp}`,
          isSettled,
          settlementAmount: setAmt,
          settlementDate: setDate,
          accId: rng.nextFloat() > 0.3 ? accountItauId : accountInterId,
        });
      }
    }
  }

  // Inserir Receivables em Lote
  const recRows = recsToInsert.map((r) => [
    r.clientId,
    r.contractId,
    r.contractVersionId,
    r.recNum,
    r.description,
    r.competency,
    r.dueDate,
    r.originalAmount,
    r.paidAmount,
    r.balanceAmount,
    r.status,
    r.idempotencyKey,
    `Título operacional ${BATCH_TAG}`,
    `${r.dueDate} 08:00:00+00`,
    `${r.dueDate} 08:00:00+00`,
  ]);

  const insertedRecIds = await batchInsertValues(
    "receivables",
    [
      "client_id", "contract_id", "contract_version_id", "receivable_number",
      "description", "competency", "due_date", "original_amount", "paid_amount",
      "balance_amount", "status", "idempotency_key", "notes", "created_at", "updated_at",
    ],
    recRows
  );

  for (let i = 0; i < recsToInsert.length; i++) {
    recsToInsert[i].id = insertedRecIds[i];
  }
  console.log(`✅ ${recsToInsert.length} Contas a Receber inseridas.`);

  // Baixas de Recebimento (Financial Settlements & Statements)
  const settledRecs = recsToInsert.filter((r) => r.isSettled);

  const setRows = settledRecs.map((r) => [
    r.id,
    r.accId,
    "RECEIPT",
    r.settlementAmount,
    r.settlementDate,
    `Recebimento confirmado ${BATCH_TAG}`,
    false,
    `${r.settlementDate} 12:00:00+00`,
  ]);

  const insertedSetIds = await batchInsertValues(
    "financial_settlements",
    [
      "receivable_id", "financial_account_id", "settlement_type",
      "amount", "settlement_date", "notes", "is_reversed", "created_at",
    ],
    setRows
  );

  // Extrato de Conta Corrente (financial_statements)
  let itauBalance = 45000.0;
  let interBalance = 25000.0;

  const stmtRows: unknown[][] = [];
  let stmtCounter = 0;

  for (let i = 0; i < settledRecs.length; i++) {
    const r = settledRecs[i];
    stmtCounter++;
    const num = `EXT-SIM-${String(stmtCounter).padStart(6, "0")}`;

    let balAfter = 0;
    if (r.accId === accountItauId) {
      itauBalance = Number((itauBalance + r.settlementAmount).toFixed(2));
      balAfter = itauBalance;
    } else {
      interBalance = Number((interBalance + r.settlementAmount).toFixed(2));
      balAfter = interBalance;
    }

    stmtRows.push([
      r.accId,
      num,
      "INFLOW",
      r.settlementAmount,
      balAfter,
      r.settlementDate,
      `Recebimento ${r.recNum} ${BATCH_TAG}`,
      insertedSetIds[i],
      `${r.settlementDate} 12:00:00+00`,
    ]);
  }

  await batchInsertValues(
    "financial_statements",
    [
      "account_id", "statement_number", "movement_type", "amount",
      "balance_after", "movement_date", "description", "settlement_id", "created_at",
    ],
    stmtRows
  );
  console.log(`✅ ${settledRecs.length} Liquidações de receita confirmadas com lançamentos no extrato.`);

  // 8. Contas a Pagar e Despesas Operacionais
  console.log("\n💸 PASSO 8: Gerando Despesas, Fornecedores e Custos Operacionais...");

  interface SimPayable {
    payNum: string;
    supplierName: string;
    categoryId: string;
    description: string;
    competency: string;
    dueDate: string;
    originalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    idempotencyKey: string;
    isSettled: boolean;
    costCenterId: string;
    id?: string;
  }

  const payablesToInsert: SimPayable[] = [];
  let payCounter = 0;

  for (const m of monthsDistribution) {
    const comp = m.month;

    const fixedExpenses = [
      { sup: createdSuppliers[0], desc: "Pacote de Motion Design e Vídeos Mensais", amt: 3500.0, cc: ccOps },
      { sup: createdSuppliers[1], desc: "Infraestrutura Cloud & Servidores CAPI", amt: 1800.0, cc: ccOps },
      { sup: createdSuppliers[2], desc: "Freelancers de Copywriting de Anúncios", amt: 2200.0, cc: ccOps },
      { sup: createdSuppliers[3], desc: "Aluguel Sede & Coworking Empresarial", amt: 4500.0, cc: ccAdm },
      { sup: createdSuppliers[4], desc: "Honorários Contábeis & Fiscais", amt: 1500.0, cc: ccAdm },
      { sup: { name: "Google & Meta Ads Próprios" }, desc: "Anúncios Próprios da Agência", amt: 2800.0, cc: ccCom },
    ];

    for (const exp of fixedExpenses) {
      payCounter++;
      const effDueDate = calculateEffectiveDueDate(10, parseInt(comp.split("-")[0], 10), parseInt(comp.split("-")[1], 10));
      const isPastCutoff = effDueDate <= "2026-11-02";

      payablesToInsert.push({
        payNum: `PAG-SIM-${String(payCounter).padStart(5, "0")}`,
        supplierName: `${exp.sup.name} ${BATCH_TAG}`,
        categoryId: catExpense,
        description: `${exp.desc} - ${comp} ${BATCH_TAG}`,
        competency: comp,
        dueDate: effDueDate,
        originalAmount: exp.amt,
        paidAmount: isPastCutoff ? exp.amt : 0.0,
        balanceAmount: isPastCutoff ? 0.0 : exp.amt,
        status: isPastCutoff ? "PAID" : "PENDING",
        idempotencyKey: `PAG_SIM_${exp.desc.slice(0, 8)}_${comp}`,
        isSettled: isPastCutoff,
        costCenterId: exp.cc,
      });
    }
  }

  // Inserir Payables em Lote
  const payRows = payablesToInsert.map((p) => [
    p.supplierName,
    p.categoryId,
    p.payNum,
    p.description,
    p.competency,
    p.dueDate,
    p.originalAmount,
    p.paidAmount,
    p.balanceAmount,
    p.status,
    p.idempotencyKey,
    `Despesa simulada ${BATCH_TAG}`,
    `${p.dueDate} 08:00:00+00`,
    `${p.dueDate} 08:00:00+00`,
  ]);

  const insertedPayIds = await batchInsertValues(
    "payables",
    [
      "supplier_name", "category_id", "payable_number", "description",
      "competency", "due_date", "original_amount", "paid_amount", "balance_amount",
      "status", "idempotency_key", "notes", "created_at", "updated_at",
    ],
    payRows
  );

  for (let i = 0; i < payablesToInsert.length; i++) {
    payablesToInsert[i].id = insertedPayIds[i];
  }

  // Rateio de Centros de Custo em Lote
  const allocRows = payablesToInsert.map((p) => [
    p.id,
    p.costCenterId,
    100.0,
    p.originalAmount,
    `${p.dueDate} 08:00:00+00`,
  ]);

  await batchInsertValues(
    "financial_cost_center_allocations",
    ["payable_id", "cost_center_id", "percentage", "amount", "created_at"],
    allocRows
  );

  // Baixas de Pagamento (Financial Settlements & Statements de Saída)
  const settledPays = payablesToInsert.filter((p) => p.isSettled);

  const paySetRows = settledPays.map((p) => [
    p.id,
    accountItauId,
    "PAYMENT",
    p.originalAmount,
    p.dueDate,
    `Pagamento realizado ${BATCH_TAG}`,
    false,
    `${p.dueDate} 14:00:00+00`,
  ]);

  const insertedPaySetIds = await batchInsertValues(
    "financial_settlements",
    [
      "payable_id", "financial_account_id", "settlement_type",
      "amount", "settlement_date", "notes", "is_reversed", "created_at",
    ],
    paySetRows
  );

  const payStmtRows: unknown[][] = [];
  for (let i = 0; i < settledPays.length; i++) {
    const p = settledPays[i];
    stmtCounter++;
    const num = `EXT-SIM-${String(stmtCounter).padStart(6, "0")}`;
    itauBalance = Number((itauBalance - p.originalAmount).toFixed(2));

    payStmtRows.push([
      accountItauId,
      num,
      "OUTFLOW",
      p.originalAmount,
      itauBalance,
      p.dueDate,
      `Pagamento ${p.payNum} ${BATCH_TAG}`,
      insertedPaySetIds[i],
      `${p.dueDate} 14:00:00+00`,
    ]);
  }

  await batchInsertValues(
    "financial_statements",
    [
      "account_id", "statement_number", "movement_type", "amount",
      "balance_after", "movement_date", "description", "settlement_id", "created_at",
    ],
    payStmtRows
  );

  // Atualizar saldos finais das contas bancárias
  await query("UPDATE financial_accounts SET current_balance = $1 WHERE id = $2", [itauBalance, accountItauId]);
  await query("UPDATE financial_accounts SET current_balance = $1 WHERE id = $2", [interBalance, accountInterId]);

  console.log(`✅ ${settledPays.length} Pagamentos de despesa confirmados.`);
  console.log(`• Saldo Final Itaú: R$ ${itauBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`• Saldo Final Inter: R$ ${interBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);

  console.log("\n================================================================================");
  console.log("🎉 SIMULAÇÃO OPERACIONAL CONCLUÍDA COM TOTAL SUCESSO!");
  console.log("================================================================================");

  return {
    leadsCount: allLeads.length,
    opportunitiesCount: allOpps.length,
    clientsCount: clientIds.length,
    proposalsCount: proposalsToInsert.length,
    contractsCount: contractsToInsert.length,
    projectsCount: projectsToInsert.length,
    receivablesCount: recsToInsert.length,
    payablesCount: payablesToInsert.length,
    settledReceiptsCount: settledRecs.length,
    settledPaymentsCount: settledPays.length,
    finalItauBalance: itauBalance,
    finalInterBalance: interBalance,
  };
}

if (process.argv[1] && process.argv[1].includes("run-simulation-2026.ts")) {
  runOperationalSimulation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Erro fatal na execução da simulação:", err);
      process.exit(1);
    });
}
