import type { PoolClient } from "pg";

// Briefing and older DNA callers must enrich the same audience catalogue used
// by the studio. Do not maintain a second array in client_identities.
export async function addIdentityAudiences(db: PoolClient, clientId: string, values: unknown) {
  if (!Array.isArray(values)) return;

  const rawEntries = values
    .filter((value): value is string => typeof value === "string")
    .map(value => value.trim())
    .filter(Boolean);

  await db.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE", [clientId]);

  // Carregar públicos existentes do cliente para evitar duplicidade
  const existingRes = await db.query(
    "SELECT id, name, description FROM client_audiences WHERE client_id = $1 AND archived_at IS NULL",
    [clientId]
  );
  const existingAudiences = existingRes.rows || [];

  for (const raw of rawEntries) {
    // Descartar ruídos conversacionais óbvios
    const lowerRaw = raw.toLowerCase();
    if (
      lowerRaw.includes("só disse um público") ||
      lowerRaw.includes("outro público") ||
      lowerRaw.includes("não sei") ||
      lowerRaw.includes("vamos lá") ||
      lowerRaw.includes("responder depois") ||
      lowerRaw.startsWith("sim,") ||
      lowerRaw.startsWith("start")
    ) {
      continue;
    }

    let name = raw;
    let description = raw;

    // Se estiver formatado como "Nome: Descrição"
    if (raw.includes(":") && !raw.startsWith("http")) {
      const [titlePart, ...rest] = raw.split(":");
      name = titlePart.trim();
      description = rest.join(":").trim() || name;
    } else if (raw.length > 50 && (raw.includes(".") || raw.includes(","))) {
      // Se for uma frase longa descritiva (ex: "Temos 03 publicos. Pessoas que sentem dor...")
      // Se já existem públicos cadastrados no cliente, não crie público com essa frase inteira
      if (existingAudiences.length > 0) {
        // Enriquecer o público default se houver ou pular duplicação
        continue;
      }
      // Se não houver nenhum público ainda, criar com nome resumido
      name = raw.slice(0, 40).trim();
      description = raw;
    }

    name = name.slice(0, 80).trim();
    if (!name) continue;

    // Verificar se já existe público com nome idêntico ou similar (case-insensitive)
    const existing = existingAudiences.find(
      (ea: { name: string }) => ea.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      // Atualizar descrição se a existente estiver vazia
      if (!existing.description && description && description !== name) {
        await db.query(
          "UPDATE client_audiences SET description = $1, updated_at = NOW() WHERE id = $2",
          [description, existing.id]
        );
      }
      continue;
    }

    // Inserir novo público apenas se não existir
    await db.query(
      `INSERT INTO client_audiences(client_id, name, description)
       SELECT $1, $2, $3 WHERE NOT EXISTS (
         SELECT 1 FROM client_audiences WHERE client_id = $1 AND lower(btrim(name)) = lower($2)
       )`,
      [clientId, name, description]
    );
  }
}
