import { describe, it, expect } from "vitest";
import { query } from "@/lib/db/pool";
import {
  listProjectTemplates,
  getProjectTemplateById,
  createProject,
  getProjectById,
  createProjectTask,
  updateProjectTask,
  addChecklistItem,
  toggleChecklistItem,
  addProjectTimeEntry,
  saveContractRecurrenceSettings,
  generateRecurringProjectForContract,
} from "../../src/modules/projects/service";

describe("Fase 11 - Gestão de Projetos (Testes de Integração)", () => {
  it("deve listar os templates padrão semeados na migração 012", async () => {
    const templates = await listProjectTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(2);
    const codes = templates.map((t) => t.code);
    expect(codes).toContain("TMPL-TRAFEGO");
    expect(codes).toContain("TMPL-WEBSITE");

    const trafegoTmpl = templates.find((t) => t.code === "TMPL-TRAFEGO")!;
    const detailed = await getProjectTemplateById(trafegoTmpl.id);
    expect(detailed).toBeDefined();
    expect(detailed?.stages?.length).toBeGreaterThanOrEqual(3);
  });

  it("deve criar projeto avulso com etapas padrão", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    const clientRes = await query<{ id: string }>(
      `INSERT INTO clients (name, type, document, status) 
       VALUES ($1, 'PJ', $2, 'ACTIVE') RETURNING id`,
      [`Cliente Projeto Teste ${uniqueSuffix}`, `88${uniqueSuffix}000100`.slice(0, 14)]
    );
    const clientId = clientRes.rows[0].id;

    const created = await createProject({
      name: `Projeto Avulso ${uniqueSuffix}`,
      description: "Website institucional",
      projectType: "STANDALONE",
      clientId,
      startDate: "2026-11-01",
      dueDate: "2026-11-30",
      estimatedHours: 40,
      estimatedBudget: 3500.0,
      status: "PLANNED",
      priority: "HIGH",
    });

    expect(created.id).toBeDefined();
    expect(created.projectNumber).toMatch(/^PRJ-\d{5}$/);
    expect(created.stages?.length).toBeGreaterThanOrEqual(4); // etapas padrão
  });

  it("deve criar tarefas, gerenciar status e checklists", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    const clientRes = await query<{ id: string }>(
      `INSERT INTO clients (name, type, document, status) 
       VALUES ($1, 'PJ', $2, 'ACTIVE') RETURNING id`,
      [`Cliente Tarefas ${uniqueSuffix}`, `77${uniqueSuffix}000100`.slice(0, 14)]
    );
    const clientId = clientRes.rows[0].id;

    const project = await createProject({
      name: `Projeto Tarefas ${uniqueSuffix}`,
      projectType: "STANDALONE",
      clientId,
      startDate: "2026-11-01",
      dueDate: "2026-11-30",
      estimatedHours: 20,
    });

    // 1. Criar tarefa
    const task = await createProjectTask({
      projectId: project.id,
      title: "Desenvolver Landing Page",
      description: "Layout responsivo e integrações",
      estimatedHours: 10,
      priority: "URGENT",
      dueDate: "2026-11-15",
    });

    expect(task.id).toBeDefined();
    expect(task.taskNumber).toMatch(/^TSK-\d{5}$/);
    expect(task.status).toBe("TODO");

    // 2. Adicionar checklist
    const check1 = await addChecklistItem({
      taskId: task.id,
      title: "Criar wireframe",
    });
    expect(check1.isCompleted).toBe(false);

    // 3. Marcar checklist como concluído
    const checkToggled = await toggleChecklistItem(check1.id, true);
    expect(checkToggled.isCompleted).toBe(true);
    expect(checkToggled.completedAt).not.toBeNull();

    // 4. Mudar status da tarefa para DONE
    const taskDone = await updateProjectTask(task.id, { status: "DONE" });
    expect(taskDone.status).toBe("DONE");
    expect(taskDone.completedAt).not.toBeNull();
  });

  it("deve apontar horas e custos operacionais sem criar lançamentos financeiros a pagar", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    const clientRes = await query<{ id: string }>(
      `INSERT INTO clients (name, type, document, status) 
       VALUES ($1, 'PJ', $2, 'ACTIVE') RETURNING id`,
      [`Cliente Horas ${uniqueSuffix}`, `66${uniqueSuffix}000100`.slice(0, 14)]
    );
    const clientId = clientRes.rows[0].id;

    const project = await createProject({
      name: `Projeto Horas ${uniqueSuffix}`,
      projectType: "STANDALONE",
      clientId,
      startDate: "2026-11-01",
      dueDate: "2026-11-30",
      estimatedHours: 10,
    });

    const task = await createProjectTask({
      projectId: project.id,
      title: "Setup de Anúncios",
      estimatedHours: 5,
    });

    // Contar total de payables antes
    const countBefore = await query<{ count: string }>(`SELECT COUNT(*) as count FROM payables`);

    // Apontar 3.5 horas com custo horário de R$ 120,00 -> R$ 420,00
    const entry = await addProjectTimeEntry({
      projectId: project.id,
      taskId: task.id,
      entryDate: "2026-11-10",
      hours: 3.5,
      description: "Criação de campanhas de Search e Display",
      hourlyRate: 120.0,
    });

    expect(entry.calculatedCost).toBe(420.0);

    // Verificar se atualizou o projeto
    const updatedPrj = await getProjectById(project.id);
    expect(updatedPrj?.actualHours).toBe(3.5);
    expect(updatedPrj?.actualCost).toBe(420.0);

    // Verificar isolamento financeiro: NENHUM título a pagar foi criado para este projeto ou apontamento
    const payablesForProject = await query(
      `SELECT id FROM payables WHERE description ILIKE $1 OR notes ILIKE $1`,
      [`%${uniqueSuffix}%`]
    );
    expect(payablesForProject.rows.length).toBe(0);
  });

  it("deve gerar projetos recorrentes por contrato com clonagem de etapas e garantir idempotência absoluta", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    // 1. Criar cliente
    const clientRes = await query<{ id: string }>(
      `INSERT INTO clients (name, type, document, status) 
       VALUES ($1, 'PJ', $2, 'ACTIVE') RETURNING id`,
      [`Cliente Recorrente ${uniqueSuffix}`, `55${uniqueSuffix}000100`.slice(0, 14)]
    );
    const clientId = clientRes.rows[0].id;

    // 2. Criar contrato ativo com versão
    const contractNum = `CTR-REC-${uniqueSuffix}`;
    const contractRes = await query<{ id: string }>(
      `INSERT INTO contracts (client_id, contract_number, status) 
       VALUES ($1, $2, 'ACTIVE') RETURNING id`,
      [clientId, contractNum]
    );
    const contractId = contractRes.rows[0].id;

    await query(
      `INSERT INTO contract_versions 
        (contract_id, version_number, title, billing_period, due_day, start_date, effective_date, total_amount)
       VALUES ($1, 1, 'Versão Inicial', 'MONTHLY', 10, '2026-01-01', '2026-01-01', 1500.00)`,
      [contractId]
    );

    // 3. Buscar template de tráfego
    const tmplRes = await query<{ id: string }>(
      `SELECT id FROM project_templates WHERE code = 'TMPL-TRAFEGO' LIMIT 1`
    );
    const templateId = tmplRes.rows[0].id;

    // 4. Configurar recorrência no contrato
    await saveContractRecurrenceSettings({
      contractId,
      isEnabled: true,
      templateId,
      periodicity: "MONTHLY",
      startDay: 1,
      durationDays: 30,
      startDate: "2026-01-01",
    });

    // 5. Primeira execução da geração para a competência 2026-11 -> DEVE CRIAR
    const genResult1 = await generateRecurringProjectForContract({
      contractId,
      competency: "2026-11",
    });

    expect(genResult1.status).toBe("CREATED");
    expect(genResult1.project.id).toBeDefined();
    expect(genResult1.project.competency).toBe("2026-11");
    expect(genResult1.project.stages?.length).toBeGreaterThanOrEqual(3);
    expect(genResult1.project.tasks?.length).toBeGreaterThanOrEqual(5);

    // 6. Segunda execução para a MESMA competência 2026-11 -> DEVE RETORNAR EXISTENTE (IDEMPOTENTE)
    const genResult2 = await generateRecurringProjectForContract({
      contractId,
      competency: "2026-11",
    });

    expect(genResult2.status).toBe("ALREADY_EXISTS");
    expect(genResult2.project.id).toBe(genResult1.project.id);

    // Conferir no banco que existe apenas 1 projeto
    const dbProjects = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM projects WHERE contract_id = $1 AND competency = '2026-11'`,
      [contractId]
    );
    expect(Number(dbProjects.rows[0].count)).toBe(1);

    // 7. Cancelar contrato e verificar que nova geração é recusada
    await query(`UPDATE contracts SET status = 'CANCELED' WHERE id = $1`, [contractId]);

    await expect(
      generateRecurringProjectForContract({
        contractId,
        competency: "2026-12",
      })
    ).rejects.toThrow("impossível gerar projeto recorrente");
  });
});
