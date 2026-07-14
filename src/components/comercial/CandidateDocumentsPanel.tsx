import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BUCKET, KIND_LABEL, MAX_SIZE, humanSize, normalizeDocs,
  uploadCandidateDoc, deleteCandidateDoc, getSignedUrl, saveDocuments,
  type CandidateDocFile, type CandidateDocuments, type DocKind,
} from "@/lib/candidateDocuments";
import { downloadDocumentsZip } from "@/lib/exportCandidatePdf";
import {
  Upload, Trash2, Eye, Loader2, FileText, ImageIcon, ShieldCheck, MapPin, Paperclip,
  Download,
} from "lucide-react";

interface Props {
  cardId: string;
  candidateName: string;
  onChanged?: () => void;
}

export function CandidateDocumentsPanel({ cardId, candidateName, onChanged }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<CandidateDocuments>({ files: [] });
  const [loading, setLoading] = useState(true);
  const [uploadingKind, setUploadingKind] = useState<DocKind | null>(null);
  const [zipping, setZipping] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase.from("commercial_pipeline_cards")
      .select("documents").eq("id", cardId).single();
    if (!error) setDocs(normalizeDocs(data?.documents));
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [cardId]);

  async function handleUpload(kind: DocKind, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadingKind(kind);
    try {
      const added: CandidateDocFile[] = [];
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_SIZE) {
          toast({ title: `Arquivo ${file.name} excede 15 MB`, variant: "destructive" });
          continue;
        }
        const rec = await uploadCandidateDoc(cardId, kind, file);
        added.push(rec);
      }
      if (added.length === 0) return;
      const next = { files: [...docs.files, ...added] };
      await saveDocuments(cardId, next);
      setDocs(next);
      onChanged?.();
      toast({ title: "Documento anexado", description: `${added.length} arquivo(s) adicionado(s).` });
    } catch (e: any) {
      toast({ title: "Falha no upload", description: e?.message ?? "Erro inesperado", variant: "destructive" });
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleDelete(file: CandidateDocFile) {
    if (!confirm(`Remover ${file.name}?`)) return;
    try {
      await deleteCandidateDoc(file.path);
      const next = { files: docs.files.filter(f => f.path !== file.path) };
      await saveDocuments(cardId, next);
      setDocs(next);
      onChanged?.();
      toast({ title: "Documento removido" });
    } catch (e: any) {
      toast({ title: "Falha ao remover", description: e?.message, variant: "destructive" });
    }
  }

  async function handlePreview(file: CandidateDocFile) {
    try {
      const url = await getSignedUrl(file.path, 900);
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast({ title: "Falha ao abrir", description: e?.message, variant: "destructive" });
    }
  }

  async function handleDownloadZip() {
    setZipping(true);
    try {
      await downloadDocumentsZip(candidateName, docs.files);
      toast({ title: "Documentos baixados", description: `${docs.files.length} arquivo(s) em ZIP.` });
    } catch (e: any) {
      toast({ title: "Falha ao gerar ZIP", description: e?.message, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  }

  const byKind: Record<DocKind, CandidateDocFile[]> = {
    identity: docs.files.filter(f => f.kind === "identity"),
    address: docs.files.filter(f => f.kind === "address"),
    other: docs.files.filter(f => f.kind === "other"),
  };

  const totalCount = docs.files.length;

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
            Documentos oficiais
          </h3>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            RG ou CNH com CPF e comprovante de endereço. Vai anexado ao dossiê em PDF.
          </p>
        </div>
        <Button
          type="button" size="sm" variant="outline" className="gap-1.5"
          disabled={zipping || totalCount === 0}
          onClick={handleDownloadZip}
          title={totalCount === 0 ? "Nenhum documento" : "Baixar só os documentos em ZIP"}
        >
          {zipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Baixar documentos</span>
          {totalCount > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{totalCount}</Badge>}
        </Button>
      </header>

      <DocSlot
        kind="identity" icon={<ShieldCheck className="h-4 w-4" />}
        files={byKind.identity} uploading={uploadingKind === "identity" || loading}
        onUpload={(fs) => handleUpload("identity", fs)}
        onDelete={handleDelete} onPreview={handlePreview}
      />
      <DocSlot
        kind="address" icon={<MapPin className="h-4 w-4" />}
        files={byKind.address} uploading={uploadingKind === "address" || loading}
        onUpload={(fs) => handleUpload("address", fs)}
        onDelete={handleDelete} onPreview={handlePreview}
      />
      <DocSlot
        kind="other" icon={<Paperclip className="h-4 w-4" />}
        files={byKind.other} uploading={uploadingKind === "other" || loading}
        onUpload={(fs) => handleUpload("other", fs)}
        onDelete={handleDelete} onPreview={handlePreview}
        optional
      />
    </section>
  );
}

function DocSlot({
  kind, icon, files, uploading, onUpload, onDelete, onPreview, optional,
}: {
  kind: DocKind;
  icon: React.ReactNode;
  files: CandidateDocFile[];
  uploading: boolean;
  onUpload: (fs: FileList) => void;
  onDelete: (f: CandidateDocFile) => void;
  onPreview: (f: CandidateDocFile) => void;
  optional?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const has = files.length > 0;

  return (
    <div className={`rounded-lg border ${has ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-border/60 bg-card/40"} p-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-6 w-6 rounded-md grid place-items-center ${has ? "bg-emerald-500/15 text-emerald-500" : "bg-secondary/60 text-muted-foreground"}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              {KIND_LABEL[kind]}
              {optional
                ? <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">opcional</Badge>
                : has
                  ? <Badge className="h-4 px-1.5 text-[9px] font-normal bg-emerald-500/20 text-emerald-500 border-emerald-500/30">anexado</Badge>
                  : <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal text-amber-500 border-amber-500/40">pendente</Badge>
              }
            </div>
            <p className="text-[10.5px] text-muted-foreground">PDF, JPG, PNG ou WEBP · até 15 MB por arquivo</p>
          </div>
        </div>
        <div>
          <input
            ref={inputRef} type="file" hidden multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
            onChange={(e) => { onUpload(e.target.files!); e.target.value = ""; }}
          />
          <Button
            type="button" size="sm" variant="outline" className="gap-1.5"
            onClick={() => inputRef.current?.click()} disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {has ? "Adicionar" : "Anexar"}
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-2 rounded border border-border/50 bg-background/50 px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {f.mime.startsWith("image/")
                  ? <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground/70 shrink-0">· {humanSize(f.size)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onPreview(f)} title="Visualizar">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(f)} title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
