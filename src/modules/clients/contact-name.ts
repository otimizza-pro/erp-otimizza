/**
 * Extrai e formata o primeiro nome do contato principal para saudações humanizadas.
 * Preserva títulos como Dr., Dra., Drª., Prof., etc. quando presentes antes do primeiro nome.
 */
export function formatContactFirstName(rawName?: string | null, companyName?: string | null): string {
  if (!rawName) return "Parceiro";
  const trimmed = rawName.trim();
  if (!trimmed) return "Parceiro";

  // Se o nome informado for idêntico ao nome da empresa, não é o nome de uma pessoa
  if (companyName && trimmed.toLowerCase() === companyName.trim().toLowerCase()) {
    return "Parceiro";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Parceiro";

  const titlePrefixes = [
    "dr", "dr.", "dra", "dra.", "drª", "drª.", "dr°", "dr°.",
    "prof", "prof.", "profa", "profa.", "profª", "profª.",
    "doutor", "doutora", "sr", "sr.", "sra", "sra.", "srª", "srª."
  ];

  const firstLower = words[0].toLowerCase().replace(/[:;,]/g, "");

  if (titlePrefixes.includes(firstLower) && words.length > 1) {
    // Preserva o título (ex: Dr., Dra., Prof.) + o primeiro nome real da pessoa
    return `${words[0]} ${words[1]}`;
  }

  // Retorna apenas o primeiro nome
  return words[0];
}
