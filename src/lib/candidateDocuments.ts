import { supabase } from "@/integrations/supabase/client";

export type DocKind = "identity" | "address" | "other";

export interface CandidateDocFile {
  kind: DocKind;
  name: string;
  path: string;
  mime: string;
  size: number;
  uploaded_at: string;
}

export interface CandidateDocuments {
  files: CandidateDocFile[];
}

export const BUCKET = "candidate-documents";
export const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
export const ACCEPTED_MIME = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf",
];

export const KIND_LABEL: Record<DocKind, string> = {
  identity: "Documento com foto (RG / CNH)",
  address: "Comprovante de endereço",
  other: "Outros documentos",
};

export function normalizeDocs(raw: unknown): CandidateDocuments {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    const files = Array.isArray(r.files) ? (r.files as CandidateDocFile[]) : [];
    return { files: files.filter(f => f && typeof f.path === "string") };
  }
  return { files: [] };
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "arquivo";
}

export async function uploadCandidateDoc(
  cardId: string, kind: DocKind, file: File,
): Promise<CandidateDocFile> {
  if (file.size > MAX_SIZE) throw new Error("Arquivo excede 15 MB.");
  if (file.type && !ACCEPTED_MIME.includes(file.type)) {
    // still allow, but warn via error only if extension unknown
  }
  const stamp = Date.now();
  const path = `${cardId}/${kind}/${stamp}-${slug(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false, contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
  return {
    kind, name: file.name, path,
    mime: file.type || "application/octet-stream",
    size: file.size, uploaded_at: new Date().toISOString(),
  };
}

export async function deleteCandidateDoc(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export async function getSignedUrl(path: string, expiresIn = 900): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "signedUrl failed");
  return data.signedUrl;
}

export async function downloadCandidateDoc(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "download failed");
  return data;
}

export async function saveDocuments(cardId: string, docs: CandidateDocuments): Promise<void> {
  const { error } = await supabase.from("commercial_pipeline_cards")
    .update({ documents: docs as any }).eq("id", cardId);
  if (error) throw new Error(error.message);
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
