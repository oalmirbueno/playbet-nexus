import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileCheck2, Loader2, Wallet, AlertTriangle } from "lucide-react";
import { WITHDRAWAL_TERMS_VERSION } from "@/config/withdrawalTerms";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  userId: string;
  target: {
    type: "influencer" | "manager";
    id: string;
    name: string;
    pix_key: string;
    pix_key_type: string;
  };
  available: number;
  onSubmitted: () => void;
}

export function WithdrawRequestForm({ userId, target, available, onSubmitted }: Props) {
  const [amount, setAmount] = useState("");
  const [notaNumber, setNotaNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const value = useMemo(() => {
    const raw = amount.replace(/\./g, "").replace(",", ".");
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const disabled =
    !confirm ||
    !file ||
    !notaNumber.trim() ||
    value <= 0 ||
    value > available ||
    uploading;

  async function submit() {
    if (disabled || !file) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("notas-fiscais")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const codigo = `${target.type === "manager" ? "SQG" : "SQ"}-${Date.now().toString(36).toUpperCase()}`;
      const payload: any = {
        codigo,
        valor: value,
        status: "Pendente",
        tipo: "pix",
        nome: target.name,
        origem: target.type === "manager" ? "painel_gerente" : "portal_influenciador",
        pix_key: target.pix_key,
        pix_key_type: target.pix_key_type,
        data: new Date().toISOString().slice(0, 10),
        nota_fiscal_url: path,
        nota_fiscal_number: notaNumber.trim(),
        nota_fiscal_uploaded_at: new Date().toISOString(),
        requester_user_id: userId,
        responsavel: `terms:${WITHDRAWAL_TERMS_VERSION}`,
      };
      if (target.type === "manager") payload.manager_id = target.id;
      else payload.influencer_id = target.id;

      const { error } = await supabase.from("saques").insert(payload);
      if (error) throw error;

      toast({
        title: "Saque solicitado",
        description: `Código ${codigo} · ${brl(value)}. NF anexada, pagamento em até 2 dias úteis.`,
      });
      setAmount(""); setNotaNumber(""); setFile(null); setConfirm(false);
      onSubmitted();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const overLimit = value > available && value > 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Wallet className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-display font-semibold">Solicitar saque</h3>
          <p className="text-[11px] text-muted-foreground">
            PIX {target.pix_key_type?.toUpperCase()} · <span className="font-mono">{target.pix_key}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Valor a sacar <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))}
              placeholder="0,00"
              className={`pl-9 tabular-nums ${overLimit ? "border-destructive" : ""}`}
            />
          </div>
          <p className={`text-[11px] ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
            Disponível: {brl(available)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Nº da nota fiscal <span className="text-destructive">*</span>
          </Label>
          <Input
            value={notaNumber}
            onChange={(e) => setNotaNumber(e.target.value)}
            placeholder="Ex: NFS-000123"
          />
        </div>
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Nota fiscal (PDF ou imagem) <span className="text-destructive">*</span>
        </Label>
        <label
          className={`mt-1.5 flex items-center gap-3 rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors ${
            file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/60 hover:border-primary/50 hover:bg-secondary/40"
          }`}
        >
          <input
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${file ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"}`}>
            {file ? <FileCheck2 className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · clique para trocar
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium">Anexar nota fiscal</div>
                <div className="text-[11px] text-muted-foreground">PDF ou foto/print · até 10 MB</div>
              </>
            )}
          </div>
        </label>
      </div>

      <label className="flex items-start gap-2 cursor-pointer text-[12px] leading-relaxed">
        <Checkbox className="mt-0.5" checked={confirm} onCheckedChange={(v) => setConfirm(!!v)} />
        <span className="text-muted-foreground">
          Confirmo que a NF anexada corresponde ao valor solicitado e aos termos aceitos.
          Sei que sem NF válida o pagamento não é processado.
        </span>
      </label>

      {overLimit && (
        <div className="flex items-start gap-2 text-[12px] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
          Valor acima do saldo liberado. Reduza para até {brl(available)}.
        </div>
      )}

      <Button onClick={submit} disabled={disabled} className="w-full gap-2">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {uploading ? "Enviando..." : "Enviar solicitação"}
      </Button>
    </div>
  );
}
