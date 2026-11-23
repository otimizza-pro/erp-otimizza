import { describe, it, expect } from "vitest";
import { z } from "zod";

const messageSchema = z.object({
  action: z.enum([
    "MESSAGE",
    "DONT_KNOW",
    "DECISION",
    "SUBMIT_CREDENTIALS",
    "SKIP_CREDENTIALS",
    "PAUSE",
    "SAVE_STEP",
    "AI_SUGGEST",
    "FINALIZE",
  ]),
  step: z.number().min(0).max(10).optional(),
  extractedIdentity: z.record(z.string(), z.unknown()).optional(),
  aiStepField: z.enum(["targetAudience", "differentials", "toneOfVoice", "competitors"]).optional(),
  message: z.string().max(6000).optional(),
  decision: z.enum(["APPROVE", "ADJUST", "RETRY"]).optional(),
  suggestedField: z.enum(["targetAudience", "differentials", "toneOfVoice", "competitors"]).optional(),
  suggestedValue: z.string().max(6000).optional(),
  credentials: z.object({ username: z.string().max(500), password: z.string().max(2000) }).nullish(),
});

describe("Briefing Carousel Multi-Step Schema & Autosave", () => {
  it("valida payload de SAVE_STEP corretamente", () => {
    const payload = {
      action: "SAVE_STEP",
      step: 2,
      extractedIdentity: {
        targetAudiences: ["Reabilitação", "Atletas"],
        differentials: ["Atendimento individualizado"],
        currentStep: 2,
      },
    };

    const parsed = messageSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.action).toBe("SAVE_STEP");
      expect(parsed.data.step).toBe(2);
      expect(parsed.data.extractedIdentity?.currentStep).toBe(2);
    }
  });

  it("valida payload de AI_SUGGEST para os 4 passos estratégicos", () => {
    const fields = ["targetAudience", "differentials", "toneOfVoice", "competitors"] as const;

    for (const field of fields) {
      const payload = {
        action: "AI_SUGGEST",
        aiStepField: field,
      };
      const parsed = messageSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.aiStepField).toBe(field);
      }
    }
  });

  it("valida payload de FINALIZE com e sem credenciais", () => {
    const finalizeWithCreds = {
      action: "FINALIZE",
      extractedIdentity: {
        targetAudiences: ["Público Geral"],
        currentStep: 6,
      },
      credentials: {
        username: "studiotrg",
        password: "securePassword123",
      },
    };

    const parsedWith = messageSchema.safeParse(finalizeWithCreds);
    expect(parsedWith.success).toBe(true);

    const finalizeWithoutCreds = {
      action: "FINALIZE",
      extractedIdentity: {
        targetAudiences: ["Público Geral"],
        currentStep: 6,
      },
      credentials: null,
    };

    const parsedWithout = messageSchema.safeParse(finalizeWithoutCreds);
    expect(parsedWithout.success).toBe(true);
  });
});
