/**
 * Exportação de dossiê comercial em PDF (jsPDF).
 * Layout padronizado, cores Playbet, sem travessões, tipografia limpa.
 *
 * Uso:
 *   const cards = await fetchAnaliseCards();
 *   await exportCandidateDossierPdf(cards, { filename: "playbet_dossies_analise.pdf" });
 */
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import wordmarkUrl from "@/assets/playbet-wordmark.webp";
import {
  downloadCandidateDoc, type CandidateDocFile, type CandidateDocuments, normalizeDocs,
  KIND_LABEL, humanSize,
} from "@/lib/candidateDocuments";

/* ----------------------------- palette ---------------------------- */
const COLOR = {
  ink: [15, 23, 42] as const,        // #0F172A
  navy: [11, 18, 32] as const,       // #0B1220
  navySoft: [30, 41, 59] as const,   // #1E293B
  brand: [52, 211, 153] as const,    // #34D399
  brand2: [34, 211, 238] as const,   // #22D3EE
  indigo: [91, 94, 240] as const,    // primary
  slate: [100, 116, 139] as const,   // #64748B
  mute: [148, 163, 184] as const,    // #94A3B8
  line: [226, 232, 240] as const,    // #E2E8F0
  soft: [248, 250, 252] as const,    // #F8FAFC
  paper: [255, 255, 255] as const,
  danger: [239, 68, 68] as const,
  amber: [245, 158, 11] as const,
};

/* --------------------------- data model --------------------------- */
export interface DossierCard {
  id: string;
  name: string;
  handle: string | null;
  primary_channel: string | null;
  source: string | null;
  niche: string | null;
  tags: string[] | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  uf: string | null;
  document?: string | null;
  stage: string;
  stage_moved_at: string;
  responded_at?: string | null;
  created_at?: string | null;
  notes: string | null;
  checklist_progress: number;
  social_profiles?: unknown;
  content_info?: unknown;
  financial_info?: unknown;
  squad_id?: string | null;
  squad_ids?: string[] | null;
  manager_id?: string | null;
  documents?: CandidateDocuments | unknown;
}

export interface DossierContext {
  squads?: { id: string; name: string }[];
  managers?: { id: string; name: string }[];
  checklist?: {
    items: { id: string; group_label: string; label: string; required: boolean }[];
    answers: Record<string, { checked: boolean; value_text?: string | null }>;
  };
}

/* --------------------------- helpers ------------------------------ */
async function imageUrlToPngDataUrl(src: string, targetW = 720): Promise<{ dataUrl: string; ratio: number }> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
    img.src = src;
  });
  const ratio = img.naturalHeight / img.naturalWidth || 0.3;
  const w = targetW;
  const h = Math.round(w * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/png"), ratio };
}

function setFill(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setStroke(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: readonly [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

const dashSanitize = (s: string) => s.replace(/[–—]/g, "-");

function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return "-"; }
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "-"; }
}

const CHANNEL_LABEL: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
  telegram: "Telegram", kwai: "Kwai", x: "X (Twitter)", twitch: "Twitch",
  facebook: "Facebook", outro: "Outro",
};

const FREQ_LABEL: Record<string, string> = {
  diaria: "Diária", "3x_semana": "3x por semana", semanal: "Semanal",
  quinzenal: "Quinzenal", esporadica: "Esporádica",
};

const COMMISSION_LABEL: Record<string, string> = {
  cpa: "CPA", revshare: "RevShare", hibrido: "Híbrido (CPA + RevShare)",
};

const PIX_LABEL: Record<string, string> = {
  cpf: "CPF", cnpj: "CNPJ", email: "E-mail",
  telefone: "Telefone", aleatoria: "Aleatória",
};

const CONTRACT_LABEL: Record<string, string> = {
  pendente: "Pendente", enviado: "Enviado", assinado: "Assinado",
};

function nf(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function summarizeSocials(list: any[]): { total: number; primary?: { network: string; handle: string; followers?: number } } {
  const total = list.reduce((acc, s) => acc + (nf(s?.followers) ?? 0), 0);
  const primary = [...list].sort((a, b) => (nf(b?.followers) ?? 0) - (nf(a?.followers) ?? 0))[0];
  return {
    total,
    primary: primary ? {
      network: String(primary.network ?? "-"),
      handle: String(primary.handle ?? "-"),
      followers: nf(primary.followers) ?? undefined,
    } : undefined,
  };
}

function buildNarrativeProfile(card: DossierCard): string {
  const socials = Array.isArray(card.social_profiles) ? card.social_profiles as any[] : [];
  const { total, primary } = summarizeSocials(socials);
  const content = (card.content_info ?? {}) as Record<string, unknown>;
  const financial = (card.financial_info ?? {}) as Record<string, unknown>;

  const contentType = (content.content_type as string) ?? "";
  const frequency = FREQ_LABEL[(content.frequency as string) ?? ""] ?? "";
  const model = COMMISSION_LABEL[(financial.commission_model as string) ?? ""] ?? "";

  const parts: string[] = [];

  parts.push(
    `${card.name} atua no nicho ${card.niche ?? "não informado"} com atuação principal ` +
    `em ${primary ? (CHANNEL_LABEL[primary.network] ?? primary.network) : (CHANNEL_LABEL[card.primary_channel ?? ""] ?? card.primary_channel ?? "canal não informado")}` +
    (primary?.handle ? ` (${primary.handle})` : "") +
    `.`
  );

  if (socials.length > 0) {
    parts.push(
      `Presença digital consolidada em ${socials.length} rede${socials.length > 1 ? "s" : ""}` +
      (total > 0 ? `, somando aproximadamente ${total.toLocaleString("pt-BR")} seguidores.` : ".")
    );
  }

  if (contentType || frequency) {
    parts.push(
      `Produção de conteúdo do tipo ${contentType || "não especificado"}` +
      (frequency ? ` com frequência ${frequency.toLowerCase()}` : "") + "."
    );
  }

  if (card.city || card.uf) {
    parts.push(`Baseado em ${[card.city, card.uf].filter(Boolean).join(" / ") || "localização não informada"}.`);
  }

  if (model) {
    parts.push(`Modelo comercial acordado: ${model}.`);
  }

  parts.push(
    `Este dossiê consolida os dados coletados nas etapas de captação, qualificação e cadastro completo, ` +
    `pronto para análise operacional e submissão à plataforma.`
  );

  return dashSanitize(parts.join(" "));
}

/* -------------------------- render engine ------------------------- */
const PAGE = { w: 210, h: 297 }; // A4 mm
const MARGIN = { x: 16, top: 44, bottom: 22 };

interface Cursor { y: number; page: number }

async function drawHeader(
  doc: jsPDF,
  logo: { dataUrl: string; ratio: number } | null,
  subtitle: string,
) {
  // navy strip
  setFill(doc, COLOR.navy);
  doc.rect(0, 0, PAGE.w, 30, "F");

  // brand accent line
  setFill(doc, COLOR.brand);
  doc.rect(0, 30, PAGE.w * 0.55, 1.2, "F");
  setFill(doc, COLOR.brand2);
  doc.rect(PAGE.w * 0.55, 30, PAGE.w * 0.45, 1.2, "F");

  // wordmark — mantém aspect ratio do arquivo real
  const logoH = 11.5; // mm
  if (logo?.dataUrl) {
    const logoW = logoH / (logo.ratio || 0.3);
    try {
      doc.addImage(logo.dataUrl, "PNG", MARGIN.x, (30 - logoH) / 2, logoW, logoH, undefined, "FAST");
    } catch {
      setText(doc, COLOR.paper);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("playbet", MARGIN.x, 18);
    }
  } else {
    setText(doc, COLOR.paper);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("playbet", MARGIN.x, 18);
  }

  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Dossie do candidato", PAGE.w - MARGIN.x, 13, { align: "right" });

  setText(doc, COLOR.brand);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(dashSanitize(subtitle), PAGE.w - MARGIN.x, 19, { align: "right" });

  setText(doc, COLOR.mute);
  doc.setFontSize(7.5);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    PAGE.w - MARGIN.x,
    25,
    { align: "right" }
  );
}

function drawFooter(doc: jsPDF, page: number, total: number, candidateName: string) {
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.2);
  doc.line(MARGIN.x, PAGE.h - 14, PAGE.w - MARGIN.x, PAGE.h - 14);

  setText(doc, COLOR.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("playbet  ·  painelcentral.playbet.app.br", MARGIN.x, PAGE.h - 8);
  doc.text(dashSanitize(candidateName), PAGE.w / 2, PAGE.h - 8, { align: "center" });
  doc.text(`${page} / ${total}`, PAGE.w - MARGIN.x, PAGE.h - 8, { align: "right" });
}

function ensureSpace(doc: jsPDF, cursor: Cursor, needed: number, onNewPage: () => void) {
  if (cursor.y + needed > PAGE.h - MARGIN.bottom) {
    doc.addPage();
    cursor.page += 1;
    onNewPage();
    cursor.y = MARGIN.top;
  }
}

function sectionTitle(doc: jsPDF, cursor: Cursor, label: string, onNewPage: () => void) {
  ensureSpace(doc, cursor, 14, onNewPage);
  cursor.y += 4;
  setFill(doc, COLOR.brand);
  doc.rect(MARGIN.x, cursor.y - 3.2, 2.2, 5, "F");
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(label.toUpperCase(), MARGIN.x + 5, cursor.y + 0.6);
  cursor.y += 3;
  setStroke(doc, COLOR.line);
  doc.setLineWidth(0.2);
  doc.line(MARGIN.x, cursor.y + 1, PAGE.w - MARGIN.x, cursor.y + 1);
  cursor.y += 6;
}

function kvGrid(
  doc: jsPDF,
  cursor: Cursor,
  rows: [string, string][],
  onNewPage: () => void,
  cols = 2,
) {
  const contentW = PAGE.w - MARGIN.x * 2;
  const gap = 6;
  const colW = (contentW - gap * (cols - 1)) / cols;
  const rowH = 11;

  for (let i = 0; i < rows.length; i += cols) {
    ensureSpace(doc, cursor, rowH + 2, onNewPage);
    for (let j = 0; j < cols; j++) {
      const item = rows[i + j];
      if (!item) continue;
      const x = MARGIN.x + j * (colW + gap);
      const [label, value] = item;
      setText(doc, COLOR.slate);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.text(label.toUpperCase(), x, cursor.y);
      setText(doc, COLOR.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const safe = dashSanitize(value || "-");
      const lines = doc.splitTextToSize(safe, colW) as string[];
      doc.text(lines.slice(0, 2), x, cursor.y + 4.6);
    }
    cursor.y += rowH;
  }
}

function paragraph(doc: jsPDF, cursor: Cursor, text: string, onNewPage: () => void) {
  const contentW = PAGE.w - MARGIN.x * 2;
  setText(doc, COLOR.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.7);
  const lines = doc.splitTextToSize(dashSanitize(text), contentW) as string[];
  const lh = 4.8;
  for (const line of lines) {
    ensureSpace(doc, cursor, lh + 1, onNewPage);
    doc.text(line, MARGIN.x, cursor.y);
    cursor.y += lh;
  }
  cursor.y += 2;
}

function progressBar(
  doc: jsPDF,
  cursor: Cursor,
  pct: number,
  onNewPage: () => void,
) {
  ensureSpace(doc, cursor, 12, onNewPage);
  const w = PAGE.w - MARGIN.x * 2;
  const h = 3.6;
  setFill(doc, COLOR.line);
  doc.roundedRect(MARGIN.x, cursor.y, w, h, 1.8, 1.8, "F");
  const fillW = Math.max(0, Math.min(1, pct / 100)) * w;
  if (fillW > 0.5) {
    setFill(doc, COLOR.brand);
    doc.roundedRect(MARGIN.x, cursor.y, fillW, h, 1.8, 1.8, "F");
  }
  setText(doc, COLOR.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text(`${pct}% concluido`, PAGE.w - MARGIN.x, cursor.y - 1.5, { align: "right" });
  cursor.y += h + 5;
}

function socialsTable(
  doc: jsPDF,
  cursor: Cursor,
  socials: any[],
  onNewPage: () => void,
) {
  const contentW = PAGE.w - MARGIN.x * 2;
  const cols = [
    { key: "network", label: "Rede", w: 32 },
    { key: "handle", label: "Handle", w: 60 },
    { key: "followers", label: "Seguidores", w: 40 },
    { key: "engagement", label: "Eng. (%)", w: contentW - 32 - 60 - 40 },
  ];
  const rowH = 8;
  ensureSpace(doc, cursor, rowH + 4, onNewPage);

  // header
  setFill(doc, COLOR.soft);
  doc.rect(MARGIN.x, cursor.y - 3, contentW, rowH, "F");
  setText(doc, COLOR.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  let x = MARGIN.x + 2;
  cols.forEach(c => {
    doc.text(c.label.toUpperCase(), x, cursor.y + 2);
    x += c.w;
  });
  cursor.y += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, COLOR.ink);

  socials.forEach((s, i) => {
    ensureSpace(doc, cursor, rowH + 1, onNewPage);
    if (i % 2 === 1) {
      setFill(doc, [252, 252, 253]);
      doc.rect(MARGIN.x, cursor.y - 3, contentW, rowH, "F");
    }
    setText(doc, COLOR.ink);
    let cx = MARGIN.x + 2;
    const followers = nf(s?.followers);
    const eng = nf(s?.engagement);
    const values = [
      CHANNEL_LABEL[String(s?.network ?? "")] ?? String(s?.network ?? "-"),
      String(s?.handle ?? "-"),
      followers !== null ? followers.toLocaleString("pt-BR") : "-",
      eng !== null ? `${eng.toFixed(1).replace(".", ",")}` : "-",
    ];
    values.forEach((v, idx) => {
      const truncated = doc.splitTextToSize(dashSanitize(v), cols[idx].w - 2)[0] ?? "";
      doc.text(truncated, cx, cursor.y + 2);
      cx += cols[idx].w;
    });
    cursor.y += rowH;
  });

  cursor.y += 2;
}

function checklistBlock(
  doc: jsPDF,
  cursor: Cursor,
  ctx: NonNullable<DossierContext["checklist"]>,
  onNewPage: () => void,
) {
  const items = ctx.items;
  if (items.length === 0) {
    paragraph(doc, cursor, "Nenhum item de checklist configurado.", onNewPage);
    return;
  }
  const groups: Record<string, typeof items> = {};
  items.forEach(i => { (groups[i.group_label] ??= []).push(i); });

  Object.entries(groups).forEach(([group, list]) => {
    ensureSpace(doc, cursor, 10, onNewPage);
    setText(doc, COLOR.indigo);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.text(dashSanitize(group).toUpperCase(), MARGIN.x, cursor.y);
    cursor.y += 4;

    list.forEach(item => {
      ensureSpace(doc, cursor, 6, onNewPage);
      const answer = ctx.answers[item.id];
      const checked = !!answer?.checked;
      // check box
      setStroke(doc, checked ? COLOR.brand : COLOR.line);
      doc.setLineWidth(0.3);
      doc.rect(MARGIN.x, cursor.y - 3, 2.8, 2.8);
      if (checked) {
        setFill(doc, COLOR.brand);
        doc.rect(MARGIN.x + 0.5, cursor.y - 2.5, 1.8, 1.8, "F");
      }
      setText(doc, COLOR.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const label = dashSanitize(item.label) + (item.required ? "  (obrigatorio)" : "");
      const lines = doc.splitTextToSize(label, PAGE.w - MARGIN.x * 2 - 5) as string[];
      doc.text(lines[0], MARGIN.x + 4.5, cursor.y - 0.7);
      cursor.y += 5;
    });
    cursor.y += 1.5;
  });
}

/* --------------------------- main render -------------------------- */
export async function exportCandidateDossierPdf(
  cards: DossierCard[],
  ctxByCard: Record<string, DossierContext> = {},
  opts: { filename?: string; subtitle?: string } = {},
): Promise<Blob> {
  if (cards.length === 0) throw new Error("Nenhum candidato para exportar.");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoPng = await imageUrlToPngDataUrl(wordmarkUrl, 720).catch(() => null);
  const subtitle = opts.subtitle ?? "Analise comercial";

  const drawChrome = (name: string) => {
    drawHeader(doc, logoPng, subtitle);
    // page number & footer are drawn at finalization
    void name;
  };

  cards.forEach((card, idx) => {
    if (idx > 0) doc.addPage();
    const cursor: Cursor = { y: MARGIN.top, page: idx + 1 };
    drawChrome(card.name);

    // hero name block
    setText(doc, COLOR.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(dashSanitize(card.name), MARGIN.x, cursor.y);
    cursor.y += 6;

    setText(doc, COLOR.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const meta = [
      card.handle,
      CHANNEL_LABEL[card.primary_channel ?? ""] ?? card.primary_channel,
      card.niche,
      [card.city, card.uf].filter(Boolean).join(" / "),
    ].filter(Boolean).join("  ·  ");
    if (meta) doc.text(dashSanitize(meta), MARGIN.x, cursor.y);
    cursor.y += 8;

    // narrative
    sectionTitle(doc, cursor, "Perfil do candidato", () => drawChrome(card.name));
    paragraph(doc, cursor, buildNarrativeProfile(card), () => drawChrome(card.name));

    // identificacao
    sectionTitle(doc, cursor, "Identificacao", () => drawChrome(card.name));
    kvGrid(
      doc, cursor,
      [
        ["Nome completo", card.name],
        ["Handle principal", card.handle ?? "-"],
        ["Canal principal", CHANNEL_LABEL[card.primary_channel ?? ""] ?? card.primary_channel ?? "-"],
        ["Nicho", card.niche ?? "-"],
        ["E-mail", card.email ?? "-"],
        ["WhatsApp", card.phone ?? "-"],
        ["Documento (CPF/CNPJ)", card.document ?? "-"],
        ["Cidade / UF", [card.city, card.uf].filter(Boolean).join(" / ") || "-"],
        ["Origem", card.source ?? "-"],
        ["Tags", (card.tags ?? []).join(", ") || "-"],
      ],
      () => drawChrome(card.name),
    );

    // redes
    const socials = Array.isArray(card.social_profiles) ? card.social_profiles as any[] : [];
    if (socials.length > 0) {
      sectionTitle(doc, cursor, "Redes e audiencia", () => drawChrome(card.name));
      socialsTable(doc, cursor, socials, () => drawChrome(card.name));
    }

    // conteudo
    const content = (card.content_info ?? {}) as Record<string, unknown>;
    if (content && Object.keys(content).length > 0) {
      sectionTitle(doc, cursor, "Conteudo e producao", () => drawChrome(card.name));
      kvGrid(
        doc, cursor,
        [
          ["Tipo de conteudo", (content.content_type as string) ?? "-"],
          ["Frequencia", FREQ_LABEL[(content.frequency as string) ?? ""] ?? (content.frequency as string) ?? "-"],
        ],
        () => drawChrome(card.name),
      );
      const links = (content.example_links as string) ?? "";
      if (links.trim()) {
        setText(doc, COLOR.slate);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.text("LINKS DE EXEMPLO", MARGIN.x, cursor.y);
        cursor.y += 4;
        paragraph(doc, cursor, links, () => drawChrome(card.name));
      }
    }

    // comercial e financeiro
    const financial = (card.financial_info ?? {}) as Record<string, unknown>;
    if (financial && Object.keys(financial).length > 0) {
      sectionTitle(doc, cursor, "Comercial e financeiro", () => drawChrome(card.name));
      kvGrid(
        doc, cursor,
        [
          ["Modelo de remuneracao", COMMISSION_LABEL[(financial.commission_model as string) ?? ""] ?? "-"],
          ["Status do contrato", CONTRACT_LABEL[(financial.contract_status as string) ?? ""] ?? "-"],
          ["Tipo de chave PIX", PIX_LABEL[(financial.pix_type as string) ?? ""] ?? "-"],
          ["Chave PIX", (financial.pix_key as string) ?? "-"],
          ["Banco", (financial.bank_name as string) || "-"],
        ],
        () => drawChrome(card.name),
      );
    }




    // atribuicao
    const ctx = ctxByCard[card.id] ?? {};
    const squads = ctx.squads ?? [];
    const managers = ctx.managers ?? [];
    const squadNames = (card.squad_ids && card.squad_ids.length > 0
      ? card.squad_ids
      : (card.squad_id ? [card.squad_id] : []))
      .map(id => squads.find(s => s.id === id)?.name)
      .filter(Boolean).join(", ") || "-";
    const managerName = managers.find(m => m.id === card.manager_id)?.name ?? "-";

    sectionTitle(doc, cursor, "Atribuicao e timeline", () => drawChrome(card.name));
    kvGrid(
      doc, cursor,
      [
        ["Etapa atual", card.stage],
        ["Movido em", fmtDateTime(card.stage_moved_at)],
        ["Squad(s)", squadNames],
        ["Gerente responsavel", managerName],
        ["Respondeu em", fmtDate(card.responded_at)],
        ["Card criado em", fmtDate(card.created_at)],
      ],
      () => drawChrome(card.name),
    );

    // notas
    if ((card.notes ?? "").trim()) {
      sectionTitle(doc, cursor, "Observacoes internas", () => drawChrome(card.name));
      paragraph(doc, cursor, card.notes!.trim(), () => drawChrome(card.name));
    }

    // documentos anexados (listagem no dossie)
    const docsMeta = normalizeDocs(card.documents);
    if (docsMeta.files.length > 0) {
      sectionTitle(doc, cursor, "Documentos anexados", () => drawChrome(card.name));
      const rows: [string, string][] = docsMeta.files.map((f, i) => [
        `${String(i + 1).padStart(2, "0")}  ${KIND_LABEL[f.kind]}`,
        `${f.name}  ·  ${humanSize(f.size)}`,
      ]);
      kvGrid(doc, cursor, rows, () => drawChrome(card.name), 1);
      setText(doc, COLOR.slate);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const info = "Os arquivos originais seguem anexados nas paginas seguintes deste PDF.";
      doc.text(dashSanitize(info), MARGIN.x, cursor.y);
      cursor.y += 5;
    }
  });

  // final footers with correct total pages (dossier only, before merging attachments)
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const name = cards[Math.min(p - 1, cards.length - 1)]?.name ?? "";
    drawFooter(doc, p, total, name);
  }

  // ---- merge documentos originais (PDF + imagens) usando pdf-lib ----
  const dossierBlob = doc.output("blob");
  let finalBlob: Blob = dossierBlob;
  try {
    const merged = await mergeAttachmentsIntoDossier(dossierBlob, cards);
    if (merged) finalBlob = merged;
  } catch (err) {
    console.warn("[dossie] falha ao anexar documentos:", err);
  }

  const filename = opts.filename ?? `playbet_dossie_${cards.length === 1 ? slug(cards[0].name) : "analise"}_${stamp()}.pdf`;
  triggerDownload(finalBlob, filename);
  return finalBlob;
}

/* ------------------- merge attachments ------------------- */
async function mergeAttachmentsIntoDossier(dossier: Blob, cards: DossierCard[]): Promise<Blob | null> {
  const anyDocs = cards.some(c => normalizeDocs(c.documents).files.length > 0);
  if (!anyDocs) return null;

  const base = await PDFDocument.load(await dossier.arrayBuffer());

  for (const card of cards) {
    const files = normalizeDocs(card.documents).files;
    if (files.length === 0) continue;

    for (const f of files) {
      try {
        const blob = await downloadCandidateDoc(f.path);
        const bytes = await blob.arrayBuffer();
        const mime = (f.mime || blob.type || "").toLowerCase();

        if (mime === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await base.copyPages(src, src.getPageIndices());
          pages.forEach(p => base.addPage(p));
        } else if (mime.startsWith("image/")) {
          const dataUrl = await blobToDataUrl(blob);
          const normalized = await normalizeImageToPng(dataUrl);
          const png = await base.embedPng(normalized.dataUrl);
          const page = base.addPage([595.28, 841.89]); // A4 pt
          const pageW = page.getWidth();
          const pageH = page.getHeight();
          const margin = 40;
          const maxW = pageW - margin * 2;
          const maxH = pageH - margin * 2 - 40;
          const scale = Math.min(maxW / png.width, maxH / png.height, 1);
          const w = png.width * scale;
          const h = png.height * scale;
          page.drawImage(png, {
            x: (pageW - w) / 2,
            y: (pageH - h) / 2 - 10,
            width: w, height: h,
          });
          // legenda
          page.drawText(`${card.name}  |  ${KIND_LABEL[f.kind]}  |  ${f.name}`, {
            x: margin, y: margin - 6, size: 9,
          });
        } else {
          // formato não suportado (heic etc.) — ignora silenciosamente na mesclagem
          console.info("[dossie] anexo ignorado (formato):", f.name, mime);
        }
      } catch (err) {
        console.warn("[dossie] falha ao anexar:", f.path, err);
      }
    }
  }

  const out = await base.save();
  return new Blob([out], { type: "application/pdf" });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read blob failed"));
    fr.readAsDataURL(blob);
  });
}

async function normalizeImageToPng(dataUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image decode failed"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

/* -------------- ZIP: só os documentos originais -------------- */
export async function downloadDocumentsZip(candidateName: string, files: CandidateDocFile[]): Promise<void> {
  if (files.length === 0) throw new Error("Nenhum documento anexado.");
  const zip = new JSZip();
  const folder = zip.folder(slug(candidateName) || "documentos")!;
  const kindFolders: Record<string, JSZip> = {};
  for (const f of files) {
    const label = KIND_LABEL[f.kind] || "outros";
    const key = slug(label);
    kindFolders[key] ??= folder.folder(key)!;
    try {
      const blob = await downloadCandidateDoc(f.path);
      kindFolders[key].file(f.name, blob);
    } catch (err) {
      console.warn("[zip] falha ao baixar:", f.path, err);
    }
  }
  const out = await zip.generateAsync({ type: "blob" });
  triggerDownload(out, `documentos_${slug(candidateName) || "candidato"}_${stamp()}.zip`);
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
