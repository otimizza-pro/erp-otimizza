/**
 * Validação e normalização de documentos brasileiros (CPF e CNPJ)
 * Implementação estrita do algoritmo Módulo 11 oficial.
 */

export function normalizeDocument(doc: string): string {
  return doc.replace(/\D/g, "");
}

export function validateCPF(cpfRaw: string): boolean {
  const cpf = normalizeDocument(cpfRaw);
  if (cpf.length !== 11) return false;

  // Rejeita sequências de números repetidos conhecidas (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9), 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

export function validateCNPJ(cnpjRaw: string): boolean {
  const cnpj = normalizeDocument(cnpjRaw);
  if (cnpj.length !== 14) return false;

  // Rejeita sequências de números repetidos
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Primeiro dígito verificador
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  // Segundo dígito verificador
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

export function formatDocument(docRaw: string): string {
  const doc = normalizeDocument(docRaw);
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return docRaw;
}

export function validateDocument(docRaw: string): boolean {
  const doc = normalizeDocument(docRaw);
  if (doc.length === 11) return validateCPF(doc);
  if (doc.length === 14) return validateCNPJ(doc);
  return false;
}

