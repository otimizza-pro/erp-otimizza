import crypto from "node:crypto";
import path from "node:path";
import { getEnv } from "@/lib/env";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".vbs",
  ".dll",
  ".com",
  ".msi",
  ".scr",
  ".pif",
  ".jar",
  ".ps1",
  ".vbe",
  ".hta",
]);

export interface StorageUploadResult {
  storageProvider: "SUPABASE_STORAGE" | "DB_STORAGE";
  storagePath: string;
  sha256Hash: string;
  fileSizeBytes: number;
}

export class DocumentStorage {
  /**
   * Valida integridade, extensão segura e limites de tamanho
   */
  static validateFile(buffer: Buffer, originalFilename: string, mimeType: string): { sha256Hash: string } {
    if (!buffer || buffer.length === 0) {
      throw new Error("O arquivo enviado está vazio (0 bytes).");
    }

    if (buffer.length > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      throw new Error(
        `Tamanho do arquivo excede o limite máximo permitido de ${MAX_DOCUMENT_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
      );
    }

    const ext = path.extname(originalFilename || "").toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new Error(`Extensão de arquivo '${ext}' não é permitida por motivos de segurança.`);
    }

    if (!mimeType || mimeType.trim() === "") {
      throw new Error("MIME type do arquivo é obrigatório.");
    }

    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");
    return { sha256Hash };
  }

  /**
   * Salva o arquivo no storage e retorna metadados
   */
  static async uploadFile(
    buffer: Buffer,
    documentId: string,
    versionNumber: number,
    originalFilename: string,
    mimeType: string
  ): Promise<StorageUploadResult> {
    const { sha256Hash } = this.validateFile(buffer, originalFilename, mimeType);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const ext = path.extname(originalFilename).toLowerCase() || ".bin";
    const uniqueId = crypto.randomUUID();
    const storagePath = `documents/${year}/${month}/${documentId}/v${versionNumber}_${uniqueId}${ext}`;

    const env = getEnv();
    let storageProvider: "SUPABASE_STORAGE" | "DB_STORAGE" = "DB_STORAGE";

    if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.NODE_ENV !== "test") {
      try {
        const supabase = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await supabase.storage.from("documents").upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

        if (!error) {
          storageProvider = "SUPABASE_STORAGE";
        }
      } catch {
        // Fallback para DB_STORAGE caso o bucket do Supabase não esteja acessível
        storageProvider = "DB_STORAGE";
      }
    }

    return {
      storageProvider,
      storagePath,
      sha256Hash,
      fileSizeBytes: buffer.length,
    };
  }

  /**
   * Obtém URL assinada temporária caso o arquivo esteja no Supabase Storage
   */
  static async getSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string | null> {
    const env = getEnv();
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }

    try {
      const supabase = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }
}
