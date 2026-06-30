import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const UFs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const NETWORKS = ["instagram","tiktok","youtube","telegram","kwai","x","twitch","facebook","outro"];

const phoneRegex = /^\+?\d[\d\s\-()]{7,}$/;
const docRegex = /^[\d./\-]{11,18}$/;

const socialSchema = z.object({
  network: z.string().min(1, "Selecione a rede"),
  handle: z.string().trim().min(1, "Handle obrigatório").max(80),
  followers: z.coerce.number().int().nonnegative().optional().or(z.literal("").transform(() => undefined)),
  engagement: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
});

const schema = z.object({
  // dados básicos
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(180),
  phone: z.string().trim().regex(phoneRegex, "Telefone inválido (use DDD)").max(40),
  document: z.string().trim().regex(docRegex, "CPF ou CNPJ inválido").max(18),
  city: z.string().trim().min(2, "Cidade obrigatória").max(80),
  uf: z.string().length(2, "UF obrigatória"),
  // redes
  social_profiles: z.array(socialSchema).min(1, "Adicione ao menos uma rede"),
  // conteúdo
  niche: z.string().trim().min(2, "Nicho obrigatório").max(60),
  content_type: z.string().trim().min(2, "Tipo de conteúdo obrigatório").max(120),
  frequency: z.string().trim().min(1, "Frequência obrigatória").max(60),
  example_links: z.string().trim().optional(),
  // comercial / financeiro
  commission_model: z.enum(["cpa","revshare","hibrido"], { required_error: "Selecione o modelo" }),
  pix_key: z.string().trim().min(3, "Chave PIX obrigatória").max(120),
  pix_type: z.enum(["cpf","cnpj","email","telefone","aleatoria"], { required_error: "Tipo PIX" }),
  bank_name: z.string().trim().max(80).optional().or(z.literal("")),
  contract_status: z.enum(["pendente","enviado","assinado"], { required_error: "Status do contrato" }),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CandidateFormValues = z.infer<typeof schema>;

interface Props {
  cardId: string;
  initial: Partial<CandidateFormValues> & {
    stage?: string;
    social_profiles?: unknown;
    content_info?: unknown;
    financial_info?: unknown;
  };
  onSaved: () => void;
}

export function CandidateRegistrationForm({ cardId, initial, onSaved }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<"save" | "send" | null>(null);

  const content = (initial.content_info ?? {}) as Record<string, unknown>;
  const financial = (initial.financial_info ?? {}) as Record<string, unknown>;
  const socials = Array.isArray(initial.social_profiles) ? (initial.social_profiles as any[]) : [];

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: initial.name ?? "",
      email: initial.email ?? "",
      phone: initial.phone ?? "",
      document: (initial as any).document ?? "",
      city: initial.city ?? "",
      uf: initial.uf ?? "",
      social_profiles: socials.length
        ? socials.map((s) => ({
            network: s.network ?? "instagram",
            handle: s.handle ?? "",
            followers: s.followers ?? undefined,
            engagement: s.engagement ?? undefined,
          }))
        : [{ network: "instagram", handle: "", followers: undefined, engagement: undefined }],
      niche: initial.niche ?? "",
      content_type: (content.content_type as string) ?? "",
      frequency: (content.frequency as string) ?? "",
      example_links: (content.example_links as string) ?? "",
      commission_model: ((financial.commission_model as any) ?? "cpa"),
      pix_key: (financial.pix_key as string) ?? "",
      pix_type: ((financial.pix_type as any) ?? "cpf"),
      bank_name: (financial.bank_name as string) ?? "",
      contract_status: ((financial.contract_status as any) ?? "pendente"),
      notes: (initial as any).notes ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "social_profiles" });

  useEffect(() => { form.reset(form.getValues()); /* sync on card change */ }, [cardId]); // eslint-disable-line

  function buildPayload(values: CandidateFormValues) {
    return {
      name: values.name,
      email: values.email,
      phone: values.phone,
      document: values.document,
      city: values.city,
      uf: values.uf,
      niche: values.niche,
      notes: values.notes || null,
      social_profiles: values.social_profiles,
      content_info: {
        content_type: values.content_type,
        frequency: values.frequency,
        example_links: values.example_links ?? "",
      },
      financial_info: {
        commission_model: values.commission_model,
        pix_key: values.pix_key,
        pix_type: values.pix_type,
        bank_name: values.bank_name ?? "",
        contract_status: values.contract_status,
      },
    };
  }

  async function persist(values: CandidateFormValues, advance: boolean) {
    setSubmitting(advance ? "send" : "save");
    const payload: Record<string, unknown> = buildPayload(values);
    if (advance) payload.stage = "analise";
    const { error } = await supabase.from("commercial_pipeline_cards").update(payload).eq("id", cardId);
    setSubmitting(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: advance ? "Enviado para análise" : "Cadastro salvo",
      description: advance ? "O card foi movido para a coluna Análise." : "Você pode continuar editando.",
    });
    onSaved();
  }

  const onSave = form.handleSubmit((v) => persist(v, false));
  const onSend = form.handleSubmit(
    (v) => persist(v, true),
    () => toast({ title: "Revise os campos", description: "Existem campos obrigatórios pendentes.", variant: "destructive" }),
  );

  const errorCount = Object.keys(form.formState.errors).length;

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Section title="Dados básicos" subtitle="Identificação do candidato">
          <div className="grid grid-cols-2 gap-3">
            <FieldText form={form} name="name" label="Nome completo *" />
            <FieldText form={form} name="email" label="E-mail *" type="email" />
            <FieldText form={form} name="phone" label="WhatsApp *" placeholder="(11) 99999-9999" />
            <FieldText form={form} name="document" label="CPF / CNPJ *" placeholder="000.000.000-00" />
            <FieldText form={form} name="city" label="Cidade *" />
            <FormField control={form.control} name="uf" render={({ field }) => (
              <FormItem>
                <FormLabel>UF *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                  <SelectContent className="max-h-72">
                    {UFs.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </Section>

        <Section title="Redes e audiência" subtitle="Pelo menos uma rede principal">
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-end rounded-lg border border-border/60 bg-card/40 p-3">
                <FormField control={form.control} name={`social_profiles.${i}.network`} render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel className="text-xs">Rede</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FieldText form={form} name={`social_profiles.${i}.handle` as const} label="Handle" placeholder="@usuario" className="col-span-4" />
                <FieldText form={form} name={`social_profiles.${i}.followers` as const} label="Seguidores" type="number" className="col-span-2" />
                <FieldText form={form} name={`social_profiles.${i}.engagement` as const} label="Eng. %" type="number" className="col-span-2" />
                <Button
                  type="button" variant="ghost" size="icon"
                  className="col-span-1 text-destructive hover:text-destructive"
                  onClick={() => fields.length > 1 && remove(i)}
                  disabled={fields.length <= 1}
                  aria-label="Remover rede"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => append({ network: "tiktok", handle: "", followers: undefined as any, engagement: undefined as any })}
            >
              <Plus className="h-3.5 w-3.5" />Adicionar rede
            </Button>
            {form.formState.errors.social_profiles && typeof form.formState.errors.social_profiles.message === "string" && (
              <p className="text-xs text-destructive">{form.formState.errors.social_profiles.message}</p>
            )}
          </div>
        </Section>

        <Section title="Conteúdo e nicho">
          <div className="grid grid-cols-2 gap-3">
            <FieldText form={form} name="niche" label="Nicho principal *" placeholder="esportes, cassino, lifestyle..." />
            <FieldText form={form} name="content_type" label="Tipo de conteúdo *" placeholder="reels, lives, vídeos..." />
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Frequência *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Frequência" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="3x_semana">3x por semana</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="esporadica">Esporádica</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="example_links" render={({ field }) => (
            <FormItem>
              <FormLabel>Links de exemplo</FormLabel>
              <FormControl><Textarea rows={3} placeholder="Cole 1 link por linha" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </Section>

        <Section title="Comercial e financeiro">
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="commission_model" render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo de remuneração *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Modelo" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="cpa">CPA</SelectItem>
                    <SelectItem value="revshare">RevShare</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="contract_status" render={({ field }) => (
              <FormItem>
                <FormLabel>Contrato *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pix_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de chave PIX *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FieldText form={form} name="pix_key" label="Chave PIX *" />
            <FieldText form={form} name="bank_name" label="Banco (opcional)" />
          </div>
        </Section>

        <Section title="Observações internas">
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormControl><Textarea rows={4} placeholder="Anotações da equipe comercial..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </Section>

        <div className="sticky bottom-0 -mx-6 px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            {errorCount > 0 ? (
              <Badge variant="destructive" className="gap-1 font-normal">
                <AlertCircle className="h-3 w-3" />{errorCount} campo{errorCount > 1 ? "s" : ""} pendente{errorCount > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 font-normal text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />Formulário válido
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onSave} disabled={!!submitting}>
              {submitting === "save" ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button type="button" onClick={onSend} disabled={!!submitting} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {submitting === "send" ? "Enviando..." : "Enviar para análise"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <header>
        <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldText({ form, name, label, placeholder, type = "text", className }: {
  form: any; name: any; label?: string; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className={className}>
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <Input type={type} placeholder={placeholder} {...field} value={field.value ?? ""} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}
