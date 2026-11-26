import { describe, expect, it, vi, beforeEach } from "vitest";
import { inferChecklistProductionDefaults } from "@/modules/production-tasks/helpers";
import {
  createProductionTaskSchema,
  rescheduleProductionTaskSchema,
} from "@/modules/production-tasks/schemas";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  withTransaction: vi.fn(async (cb: (client: { query: typeof mockQuery }) => Promise<unknown>) =>
    cb({ query: mockQuery })
  ),
}));

vi.mock("@/lib/db/pool", () => ({
  query: mockQuery,
  withTransaction: vi.fn(async (cb: (client: { query: typeof mockQuery }) => Promise<unknown>) =>
    cb({ query: mockQuery })
  ),
}));

import {
  completeProductionTask,
  createProductionTask,
} from "@/modules/production-tasks/service";

describe("production-tasks helpers & schemas", () => {
  it("infers FILMING and uses referenceDateStr when fallbackDueDate is null", () => {
    const result = inferChecklistProductionDefaults(
      "Gravar Reels com Dra. Ramiele",
      null,
      "2026-11-10"
    );
    expect(result.taskType).toBe("FILMING");
    expect(result.dueDate).toBe("2026-11-10");
  });

  it("infers CLIENT_MEETING when title mentions reunião", () => {
    const result = inferChecklistProductionDefaults(
      "Reunião de alinhamento mensal",
      null,
      "2026-11-10"
    );
    expect(result.taskType).toBe("CLIENT_MEETING");
    expect(result.dueDate).toBe("2026-11-10");
  });

  it("uses fallbackDueDate when provided", () => {
    const result = inferChecklistProductionDefaults(
      "Revisão de legenda",
      "2026-11-25",
      "2026-11-10"
    );
    expect(result.taskType).toBe("CONTENT_REVIEW");
    expect(result.dueDate).toBe("2026-11-25");
  });

  it("validates createProductionTaskSchema and rescheduleProductionTaskSchema", () => {
    expect(
      createProductionTaskSchema.safeParse({
        title: "Gravação externa",
        taskType: "FILMING",
        dueDate: "2026-11-20",
      }).success
    ).toBe(true);

    expect(
      rescheduleProductionTaskSchema.safeParse({
        newDueDate: "2026-11-22",
        reason: "Cliente pediu alteração de data.",
      }).success
    ).toBe(true);

    expect(
      rescheduleProductionTaskSchema.safeParse({
        newDueDate: "2026-11-22",
        reason: "",
      }).success
    ).toBe(false);
  });
});

describe("production-tasks service exports", () => {
  it("exports createProductionTask and completeProductionTask", () => {
    expect(typeof createProductionTask).toBe("function");
    expect(typeof completeProductionTask).toBe("function");
  });
});
