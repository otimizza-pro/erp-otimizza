import { query } from "../src/lib/db/pool";

async function main() {
  const authUserId = "aa2cbf77-f72a-45bb-9a58-f54bc68fe232";
  const email = "otimizzapro@gmail.com";

  const res = await query(
    `INSERT INTO users (id, email, name, password_hash, role, status)
     VALUES ($1, $2, $3, 'SUPABASE_AUTH', $4, $5)
     ON CONFLICT (email) DO UPDATE SET id = $1, status = $5, role = $4
     RETURNING *`,
    [authUserId, email, "Administrador Otimizza", "ADMIN", "ACTIVE"]
  );

  console.log("Usuario sincronizado com sucesso:", res.rows[0]);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro ao sincronizar usuario:", err);
  process.exit(1);
});
