import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/pool", () => ({ query: vi.fn() }));
import { CommunicationProfileSchema } from "@/modules/clients/communication-profile";
import { chooseContentCommunication, clientContextPrompt, type AiClientContext } from "@/lib/ai/client-context";

function context(): AiClientContext {
  return {
    companyId: "clinic", company: { name: "Clínica" }, identity: {}, audiences: [], brandVoice: {}, editorialLines: [], sources: [], missing: [],
    communicationProfile: {
      speakerTypes: ["Empresa / marca institucional"],
      audienceTypes: ["Pacientes", "Familiares / cuidadores"],
      contentVoices: ["Profissional / especialista como porta-voz"],
      details: "A profissional representa a clínica.",
    },
  };
}
describe("Perfil de comunicação", () => {
  it("preserva seleções múltiplas e elimina somente duplicatas", () => {
    const profile = CommunicationProfileSchema.parse({ speakerTypes: ["Pessoa / marca pessoal", "Empresa / marca institucional"], audienceTypes: ["Pacientes", "Empresas / pessoas jurídicas", "Pacientes"] });
    expect(profile.speakerTypes).toHaveLength(2);
    expect(profile.audienceTypes).toHaveLength(2);
  });
  it("não deduz perfis de comunicação quando o cadastro antigo não os informa", () => {
    expect(CommunicationProfileSchema.parse({}).speakerTypes).toEqual([]);
  });
  it("exige escolher um público quando há vários", () => {
    expect(() => chooseContentCommunication(context(), {})).toThrow(/público desta peça/);
  });
  it("diferencia a marca institucional da especialista que aparece em vídeo", () => {
    const data = context();
    chooseContentCommunication(data, { audience: "Pacientes" });
    expect(data.currentContent).toEqual({ audience: "Pacientes", speaker: "Empresa / marca institucional", voice: "Profissional / especialista como porta-voz" });
    const prompt = clientContextPrompt(data);
    expect(prompt).toContain("A profissional representa a clínica");
    expect(prompt).toContain("não misture todos os públicos");
  });
  it("não aceita público que não pertence à seleção do cliente", () => {
    expect(() => chooseContentCommunication(context(), { audience: "Empresários" })).toThrow(/perfis cadastrados/);
  });
});
