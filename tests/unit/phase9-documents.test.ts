import { describe, it, expect } from "vitest";
import { DocumentStorage, MAX_DOCUMENT_FILE_SIZE_BYTES } from "@/modules/documents/storage";
import {
  CreateDocumentInputSchema,
  AddDocumentVersionInputSchema,
  LinkDocumentInputSchema,
} from "@/modules/documents/types";

describe("Fase 9 - Testes Unitários de Gestão Documental", () => {
  describe("Validação de Arquivos e Integridade SHA-256", () => {
    it("calcula hash SHA-256 corretamente para um buffer", () => {
      const content = Buffer.from("Conteúdo confidencial de teste Otimizza ERP");
      const { sha256Hash } = DocumentStorage.validateFile(content, "proposta.pdf", "application/pdf");

      expect(sha256Hash).toBeDefined();
      expect(sha256Hash).toHaveLength(64);
      expect(typeof sha256Hash).toBe("string");
    });

    it("bloqueia arquivos vazios (0 bytes)", () => {
      const emptyBuffer = Buffer.from("");
      expect(() =>
        DocumentStorage.validateFile(emptyBuffer, "arquivo.pdf", "application/pdf")
      ).toThrow("O arquivo enviado está vazio (0 bytes).");
    });

    it("bloqueia arquivos que excedem o tamanho máximo permitido (25MB)", () => {
      // Cria buffer simulado que excede MAX_DOCUMENT_FILE_SIZE_BYTES
      const largeBuffer = {
        length: MAX_DOCUMENT_FILE_SIZE_BYTES + 1024,
      } as Buffer;

      expect(() =>
        DocumentStorage.validateFile(largeBuffer, "grande.pdf", "application/pdf")
      ).toThrow("Tamanho do arquivo excede o limite máximo permitido");
    });

    it("bloqueia extensões executáveis perigosas (.exe, .bat, .sh, .cmd)", () => {
      const buffer = Buffer.from("echo virus");
      expect(() =>
        DocumentStorage.validateFile(buffer, "malware.exe", "application/x-msdownload")
      ).toThrow("não é permitida por motivos de segurança");

      expect(() =>
        DocumentStorage.validateFile(buffer, "script.bat", "application/x-bat")
      ).toThrow("não é permitida por motivos de segurança");

      expect(() =>
        DocumentStorage.validateFile(buffer, "script.sh", "application/x-sh")
      ).toThrow("não é permitida por motivos de segurança");
    });

    it("permite extensões seguras corporativas (.pdf, .docx, .xlsx, .png)", () => {
      const buffer = Buffer.from("conteudo valido");
      expect(() =>
        DocumentStorage.validateFile(buffer, "contrato.pdf", "application/pdf")
      ).not.toThrow();

      expect(() =>
        DocumentStorage.validateFile(buffer, "planilha.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      ).not.toThrow();

      expect(() =>
        DocumentStorage.validateFile(buffer, "comprovante.png", "image/png")
      ).not.toThrow();
    });
  });

  describe("Validação de Schemas Zod de Entrada", () => {
    it("valida schema de criação de documento com dados válidos", () => {
      const valid = {
        title: "Contrato de Prestação de Serviços",
        description: "Contrato assinado pelo cliente Alfa",
        categoryId: "CONTRACT",
        tags: ["contrato", "2026", "alfa"],
        issueDate: "2026-10-31",
        originalFilename: "contrato_alfa_assinado.pdf",
        mimeType: "application/pdf",
        links: [
          {
            entityType: "CLIENT" as const,
            entityId: "11111111-1111-1111-1111-111111111111",
            linkType: "CONTRACT_ATTACHMENT",
          },
        ],
      };

      const result = CreateDocumentInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejeita criação sem título ou com título curto", () => {
      const invalid = {
        title: "a",
        categoryId: "CONTRACT",
        originalFilename: "doc.pdf",
        mimeType: "application/pdf",
      };

      const result = CreateDocumentInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("valida schema de nova versão exigindo justificativa", () => {
      const valid = {
        documentId: "22222222-2222-2222-2222-222222222222",
        originalFilename: "aditivo_v2.pdf",
        mimeType: "application/pdf",
        reasonForChange: "Adicionado aditivo com reajuste de escopo",
      };

      const result = AddDocumentVersionInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejeita nova versão com justificativa em branco", () => {
      const invalid = {
        documentId: "22222222-2222-2222-2222-222222222222",
        originalFilename: "aditivo_v2.pdf",
        mimeType: "application/pdf",
        reasonForChange: "  ",
      };

      const result = AddDocumentVersionInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("valida schema de vínculo com entidade suportada", () => {
      const valid = {
        documentId: "33333333-3333-3333-3333-333333333333",
        entityType: "PROPOSAL" as const,
        entityId: "44444444-4444-4444-4444-444444444444",
        linkType: "OFFICIAL_PROPOSAL_PDF",
      };

      const result = LinkDocumentInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
