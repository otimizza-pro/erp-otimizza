import { describe, expect, it } from "vitest";
import { isEditorialTemplate } from "@/modules/projects/editorial-template";

describe("planejamento de publicações por modelo", () => {
  it.each([
    ["ONB-SOCIAL", "Social Media", false],
    ["CUSTOM", "Onboarding de Social Media", false],
    [null, null, false],
    ["TMPL-TRAFEGO", "Gestão mensal de tráfego", false],
    ["DEL-SOCIAL-GRAV", "Com gravação", true],
    ["DEL-SOCIAL-SEMGRAV", "Sem gravação", true],
  ] as const)("%s / %s", (code, name, expected) => {
    expect(isEditorialTemplate(code, name)).toBe(expected);
  });
});
