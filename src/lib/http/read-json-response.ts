/** Handles proxy/time-limit failures that return HTML or an empty body. */
export async function readJsonResponse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const body = await response.text();
  if (response.status === 401) throw new Error("Sua sessão expirou. Entre novamente no sistema.");
  if (response.status === 504 || response.status === 408) {
    throw new Error("O servidor excedeu o tempo de resposta. A operação não foi confirmada. Atualize os materiais salvos antes de tentar novamente.");
  }
  let data: T;
  try { data = JSON.parse(body); }
  catch {
    throw new Error(`O servidor retornou ${body.trim() ? "uma resposta inválida" : "uma resposta vazia"} (HTTP ${response.status}). A operação não foi confirmada. Tente carregar a página novamente.`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("O servidor retornou um formato inesperado. A operação não foi confirmada.");
  }
  return data;
}
