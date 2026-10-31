import { describe, it, expect } from "vitest";
import {
  CreateProjectSchema,
  CreateTaskSchema,
  CreateChecklistSchema,
  CreateTimeEntrySchema,
  ConfigureContractRecurrenceSchema,
} from "../../src/modules/projects/types";

describe("Fase 11 - Gestão de Projetos (Testes Unitários)", () => {
  it("deve validar schema de criação de projeto avulso", () => {
    const valid = CreateProjectSchema.parse({
      name: "Implantação de ERP Otimizza",
      description: "Customizações e treinamento inicial",
      projectType: "STANDALONE",
      clientId: "11111111-1111-1111-1111-111111111111",
      startDate: "2026-11-01",
      dueDate: "2026-11-30",
      estimatedHours: 40,
      estimatedBudget: 5000.0,
    });

    expect(valid.name).toBe("Implantação de ERP Otimizza");
    expect(valid.projectType).toBe("STANDALONE");
    expect(valid.status).toBe("PLANNED");
    expect(valid.priority).toBe("MEDIUM");

    expect(() =>
      CreateProjectSchema.parse({
        name: "Ab", // menor que 3 caracteres
        startDate: "2026-11-01",
        dueDate: "2026-11-30",
      })
    ).toThrow();
  });

  it("deve validar schema de criação de tarefas e checklist", () => {
    const validTask = CreateTaskSchema.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Configurar campanhas no Meta Ads",
      description: "Subir criativos e definir público",
      estimatedHours: 4.5,
      priority: "HIGH",
    });

    expect(validTask.title).toBe("Configurar campanhas no Meta Ads");
    expect(validTask.priority).toBe("HIGH");
    expect(validTask.status).toBe("TODO");

    const validChecklist = CreateChecklistSchema.parse({
      taskId: "22222222-2222-2222-2222-222222222222",
      title: "Verificar pixel de conversão ativo",
    });
    expect(validChecklist.title).toBe("Verificar pixel de conversão ativo");
  });

  it("deve validar schema de apontamento de horas com validação de horas positivas", () => {
    const validTime = CreateTimeEntrySchema.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      entryDate: "2026-11-10",
      hours: 2.5,
      description: "Otimização de palavras-chave negativas no Google Ads",
      hourlyRate: 150.0,
    });

    expect(validTime.hours).toBe(2.5);
    expect(validTime.hourlyRate).toBe(150.0);

    expect(() =>
      CreateTimeEntrySchema.parse({
        projectId: "11111111-1111-1111-1111-111111111111",
        entryDate: "2026-11-10",
        hours: -1, // inválido
        description: "Teste",
      })
    ).toThrow();
  });

  it("deve validar schema de configuração de recorrência por contrato", () => {
    const validRec = ConfigureContractRecurrenceSchema.parse({
      contractId: "11111111-1111-1111-1111-111111111111",
      isEnabled: true,
      templateId: "33333333-3333-3333-3333-333333333333",
      startDay: 5,
      startDate: "2026-11-01",
    });

    expect(validRec.isEnabled).toBe(true);
    expect(validRec.startDay).toBe(5);
    expect(validRec.periodicity).toBe("MONTHLY");

    expect(() =>
      ConfigureContractRecurrenceSchema.parse({
        contractId: "11111111-1111-1111-1111-111111111111",
        isEnabled: true,
        templateId: "33333333-3333-3333-3333-333333333333",
        startDay: 40, // inválido
        startDate: "2026-11-01",
      })
    ).toThrow();
  });
});
