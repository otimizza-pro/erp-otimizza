import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { aiFailure, contentModel, strategyModel, generateWithOpenRouter, parseAiJson } from "@/lib/ai/openrouter";

const request = { model: "test/model", messages: [{ role: "user" as const, content: "Teste" }] };

describe("Falhas de IA não viram sucesso local", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "unit-test-key");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  it("recusa chave ausente sem fazer chamada", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(generateWithOpenRouter(request)).rejects.toMatchObject({ code: "AI_KEY_MISSING", status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[401, "AI_KEY_REJECTED"], [402, "AI_INSUFFICIENT_CREDITS"], [429, "AI_RATE_LIMIT"], [404, "AI_MODEL_UNAVAILABLE"], [500, "AI_PROVIDER_ERROR"]])("HTTP %s retorna %s", async (status, code) => {
    vi.mocked(fetch).mockResolvedValue(new Response("detalhes privados", { status: Number(status) }));
    try {
      await generateWithOpenRouter(request);
      throw new Error("Sucesso indevido");
    } catch (error) {
      const failure = aiFailure(error);
      expect(failure.body.success).toBe(false);
      expect(failure.body.code).toBe(code);
      expect(failure.body.error).not.toContain("detalhes privados");
    }
  });
  it("recusa resposta vazia e resposta truncada", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "" }, finish_reason: "stop" }] }));
    await expect(generateWithOpenRouter({ ...request, disableFallback: true })).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "Incompleto" }, finish_reason: "length" }] }));
    await expect(generateWithOpenRouter({ ...request, disableFallback: true })).rejects.toMatchObject({ code: "AI_TRUNCATED_RESPONSE" });
  });
  it("retorna conteúdo e o modelo real apenas após uma resposta válida", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ model: "test/actual", choices: [{ message: { content: "Completo" }, finish_reason: "stop" }] }));
    expect(await generateWithOpenRouter(request)).toEqual({ text: "Completo", model: "test/actual", source: "OPENROUTER", usage: null, providerRequestId: null });
  });
  it("preserva custo de resposta truncada e envia esforço solicitado",async()=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({model:'test/actual',usage:{cost:0.02,completion_tokens:8000},choices:[{message:{content:'Incompleto'},finish_reason:'length'}]}));
    await expect(generateWithOpenRouter({...request,reasoningEffort:'low',maxTokens:8000,disableFallback:true})).rejects.toMatchObject({code:'AI_TRUNCATED_RESPONSE',actualModel:'test/actual',usage:{cost:0.02}});
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).reasoning).toEqual({effort:'low',exclude:true});
  });
  it('reserva a saída estruturada ao desativar thinking explicitamente',async()=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({choices:[{message:{content:'[]'},finish_reason:'stop'}]}));
    await generateWithOpenRouter({...request,reasoningEffort:'low',disableThinking:true});
    const body=JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));expect(body.reasoning).toEqual({enabled:false,exclude:true});expect(body.chat_template_kwargs).toEqual({enable_thinking:false});
  });
  it("envia o teto de preço mesmo quando o modelo é substituído pela configuração", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ model: "test/actual", choices: [{ message: { content: "Completo" }, finish_reason: "stop" }] }));
    await generateWithOpenRouter(request);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.provider.max_price).toEqual({ prompt: 2, completion: 10 });
  });
  it("usa Sol por padrão e controla raciocínio sem parâmetro de temperatura conflitante", async () => {
    vi.stubEnv("OPENROUTER_CONTENT_MODEL", "");
    vi.stubEnv("OPENROUTER_STRATEGY_MODEL", "");
    expect(contentModel()).toBe("openai/gpt-6.2-sol");
    expect(strategyModel()).toBe("openai/gpt-6.2-sol");
    vi.mocked(fetch).mockResolvedValue(Response.json({ model: "openai/gpt-6.2-sol", choices: [{ message: { content: "Completo" }, finish_reason: "stop" }] }));
    await generateWithOpenRouter({ ...request, model: contentModel() });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.reasoning.effort).toBe("medium");
    expect(body.temperature).toBeUndefined();
  });
  it("falha de rede não gera texto padrão", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(generateWithOpenRouter(request)).rejects.toMatchObject({ code: "AI_CONNECTION_FAILED" });
  });
  it("aborta a chamada e identifica timeout", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const result = generateWithOpenRouter({ ...request, timeoutMs: 10, disableFallback: true });
    const assertion = expect(result).rejects.toMatchObject({ code: "AI_TIMEOUT", status: 504 });
    await vi.advanceTimersByTimeAsync(11);
    await assertion;
  });
  it("executa protocolo de fallback sequencial (Time A e Time B) quando modelos falham até obter sucesso", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("rate limit", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "" }, finish_reason: "stop" }] }))
      .mockResolvedValueOnce(Response.json({ model: "openai/gpt-5", choices: [{ message: { content: "Sucesso no fallback" }, finish_reason: "stop" }] }));

    const res = await generateWithOpenRouter(request);
    expect(res.text).toBe("Sucesso no fallback");
    expect(res.model).toBe("openai/gpt-5");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("só retorna erro após tentar todas as IAs do Time A e Time B", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("indisponivel", { status: 502 }));
    await expect(generateWithOpenRouter(request)).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
    expect(fetch).toHaveBeenCalledTimes(10);
  });
  it("JSON fora do contrato não é aceito como sucesso", () => {
    expect(() => parseAiJson('["uma ideia"]', z.array(z.string()).length(5))).toThrow(/Nenhum resultado foi salvo/);
  });
});
