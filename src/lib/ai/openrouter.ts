import {z} from "zod";

export class AiGenerationError extends Error {
  constructor(public code:string, message:string, public status=502){
    super(message);
    this.name="AiGenerationError";
  }
}

export const contentModel = () => process.env.OPENROUTER_CONTENT_MODEL?.trim() || "openai/gpt-6.2-sol";
export const strategyModel = () => process.env.OPENROUTER_STRATEGY_MODEL?.trim() || "openai/gpt-6.2-sol";
export const adsModel = () => process.env.OPENROUTER_ADS_MODEL?.trim() || strategyModel();
export const webModel = () => process.env.OPENROUTER_WEB_MODEL?.trim() || contentModel();

export const STRATEGY_TEMPERATURE = 0.3;
export const CONTENT_TEMPERATURE = 0.7;
export const WEB_TEMPERATURE = 0.5;
export const ADS_TEMPERATURE = 0.65;

export const GLOBAL_HUMANIZATION_RULES = `REGRAS GLOBAIS DE HUMANIZAÇÃO E ESCRITA:
- Escrever em português brasileiro natural, falado e próximo — como uma conversa franca de negócios, nunca como texto de manual ou teleprompter.
- LISTA NEGRA DE CLICHÊS DE IA (TERMINANTEMENTE PROIBIDO USAR): "desbloqueie", "eleve", "potencialize", "mergulhe", "no cenário atual", "transforme sua jornada", "alavanque", "segredo revelado", "mude o jogo".
- Evitar aberturas genéricas com perguntas clichês (ex: "Você já se perguntou...?").
- Limitar emojis a no máximo 2 por texto, apenas quando fizerem sentido real para o contexto da mensagem.`;

export const STRATEGY_CAMPAIGN_DNA_INSTRUCTION = `Ao final da entrega estratégica, encerre OBRIGATORIAMENTE com um bloco padronizado chamado [DNA_DA_CAMPANHA] (contendo apenas: Público-alvo, Dor Principal, Desejo Principal, Mecanismo Único, 3 Objeções e Tom de Voz), para que os outros agentes consumam esse resumo enxuto em vez do briefing inteiro:
[DNA_DA_CAMPANHA]
- Público-alvo: <segmento prioritário objetivo>
- Dor Principal: <principal problema e frustração a resolver>
- Desejo Principal: <resultado concreto almejado>
- Mecanismo Único: <o método, diferencial exclusivo ou lógica da solução>
- 3 Objeções: 1. <objeção 1>; 2. <objeção 2>; 3. <objeção 3>
- Tom de Voz: <postura e tom da comunicação>`;

export function aiFailure(error:unknown){
  const e = error instanceof AiGenerationError ? error : new AiGenerationError("AI_GENERATION_FAILED","Não foi possível concluir a geração. Nenhum resultado foi confirmado.",503);
  return {body:{success:false,error:e.message,code:e.code},status:e.status};
}

const responseSchema = z.object({
  model: z.string().optional(),
  choices: z.array(z.object({
    message: z.object({content: z.string().trim().min(1)}),
    finish_reason: z.string().nullish()
  })).min(1)
});

export interface GenerateWithOpenRouterInput {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  maxTokens?: number;
  temperature?: number;
  customApiKey?: string;
  timeoutMs?: number;
}

export async function generateWithOpenRouter(input: GenerateWithOpenRouterInput){
  const key = input.customApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  if(!key) throw new AiGenerationError("AI_KEY_MISSING","Chave do OpenRouter não configurada. Preencha OPENROUTER_API_KEY no servidor e reinicie a aplicação.",503);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 45000);

  const isClaudeOrSol = ["anthropic/claude-sonnet-5.5", "openai/gpt-6.2-sol"].includes(input.model);
  let tempConfig: Record<string, unknown> = {};

  if (input.temperature !== undefined) {
    tempConfig = { temperature: input.temperature };
  } else if (isClaudeOrSol) {
    tempConfig = { reasoning: { effort: "medium", exclude: true } };
  } else {
    tempConfig = { temperature: 0.7 };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Otimizza ERP"
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        provider: { max_price: { prompt: 2, completion: 10 } },
        ...tempConfig,
        max_tokens: input.maxTokens ?? 6000
      })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AiGenerationError("AI_KEY_REJECTED","O OpenRouter recusou a chave ou o acesso ao modelo. Confira a configuração.");
      if (response.status === 402) throw new AiGenerationError("AI_INSUFFICIENT_CREDITS","O OpenRouter informou saldo insuficiente. Recarregue a conta antes de tentar novamente.",503);
      if (response.status === 429) throw new AiGenerationError("AI_RATE_LIMIT","O limite de chamadas da IA foi atingido. Aguarde antes de tentar novamente.",429);
      if (response.status === 404) throw new AiGenerationError("AI_MODEL_UNAVAILABLE","Não há modelo ou provedor disponível dentro do limite de preço configurado. Nenhuma geração foi confirmada.");
      throw new AiGenerationError("AI_PROVIDER_ERROR","O OpenRouter não concluiu a solicitação. Tente novamente mais tarde.",502);
    }

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new AiGenerationError("AI_INVALID_RESPONSE","A IA retornou uma resposta vazia ou inválida. Nenhum conteúdo foi aceito.");
    const choice = parsed.data.choices[0];
    if (choice.finish_reason === "length") throw new AiGenerationError("AI_TRUNCATED_RESPONSE","A resposta da IA foi cortada pelo limite de tamanho. Reduza o pedido e tente novamente.");
    if (choice.finish_reason !== "stop") throw new AiGenerationError("AI_INCOMPLETE_RESPONSE","O provedor não confirmou a conclusão da geração. Nenhum conteúdo foi aceito.");
    return { text: choice.message.content, model: parsed.data.model || input.model, source: "OPENROUTER" as const };
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    if (controller.signal.aborted) throw new AiGenerationError("AI_TIMEOUT","A IA excedeu o tempo limite. Nenhum resultado foi confirmado; tente novamente.",504);
    throw new AiGenerationError("AI_CONNECTION_FAILED","Não foi possível receber uma resposta válida do OpenRouter. Confira a conexão e tente novamente.",503);
  } finally {
    clearTimeout(timeout);
  }
}

export function parseAiJson<T>(text:string, schema:z.ZodType<T>):T{
  try {
    return schema.parse(JSON.parse(text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim()));
  } catch {
    throw new AiGenerationError("AI_INVALID_STRUCTURE","A IA não retornou a estrutura solicitada. Nenhum resultado foi salvo.");
  }
}
