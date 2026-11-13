const { Client } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const sql = fs.readFileSync('database/migrations/021_content_studio_and_editorial_calendar.sql', 'utf8');

async function main() {
  const client = new Client({
    connectionString: env.DATABASE_URL || env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Aplicando migração 021 no Supabase...");
  await client.query(sql);
  console.log("✅ Migração 021 aplicada com sucesso!");
  await client.end();
}

main().catch(err => {
  console.error("Erro na migração 021:", err);
  process.exit(1);
});

