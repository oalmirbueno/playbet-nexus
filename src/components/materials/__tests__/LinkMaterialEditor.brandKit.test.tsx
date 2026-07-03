import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Integration test: quando o tracking link não tem game_slug/game_name
 * (apenas influencer + LP + link de afiliado), o LinkMaterialEditor DEVE:
 *   1. Renderizar o bloco "Kit da marca · ativos isolados"
 *   2. Expor 3 botões separados: PlayBet, plataforma (logo), Selo
 *   3. Ao clicar em cada botão, disparar downloadRawAsset com a URL correta
 *   4. Expor botão "Baixar tudo"
 */

// ── Mock creativeStudio: só nos interessa observar downloadRawAsset ─────────
const downloadRawAsset = vi.fn(async (_url: string, _name: string) => {});
const renderCreative = vi.fn(async () => ({ dataUrl: "data:image/png;base64,AAA", blob: new Blob() }));
const downloadCreative = vi.fn();
vi.mock("@/lib/creativeStudio", () => ({
  downloadRawAsset,
  renderCreative,
  downloadCreative,
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
  FORMAT_SIZES: {
    feed: { w: 1080, h: 1080, label: "Feed" },
    story: { w: 1080, h: 1920, label: "Story" },
    landscape: { w: 1200, h: 628, label: "Landscape" },
    square_wa: { w: 800, h: 800, label: "WA" },
  },
  STYLE_LABEL: { hype: "Hype", minimal: "Minimal", editorial: "Editorial" },
}));

vi.mock("@/assets/logo-mark.png", () => ({ default: "/playbet-logo.png" }));

// ── Mock BrandLockBadge (evita carregar deps de brandRegistry no snapshot) ─
vi.mock("@/components/brand/BrandLockBadge", () => ({
  BrandLockBadge: () => null,
}));

// ── Mock useLinkBrand para retornar uma marca com logos + selo ──────────────
const BRAND_LOGO = "https://cdn.test/estrela-wordmark.png";
const BRAND_SEAL = "https://cdn.test/estrela-selo.png";
vi.mock("@/lib/useLinkBrand", () => ({
  useLinkBrand: () => ({
    data: {
      brand: {
        key: "estrela-bet",
        name: "Estrela Bet",
        logos: { wordmark: BRAND_LOGO, mark: BRAND_LOGO, lockup: BRAND_LOGO },
        seal: {
          license: "SPA/MF nº 001/2025",
          horizontal: { light: BRAND_SEAL, dark: BRAND_SEAL },
          vertical: { light: BRAND_SEAL },
        },
      },
      isLegallyReady: true,
    },
  }),
}));

// ── Mock supabase: link sem game, sem instance, sem materials ──────────────
const LINK = {
  id: "tl-nogame",
  game_name: null,
  game_icon_url: null,
  game_slug: null,
  short_url: "https://lkrh.pro/xyz",
  tracking_code: "abc123",
  hype_reason: null,
  landing_page_instance_id: null,
  platform_account_id: "pa-1",
  influencer_id: "inf-1",
};

function buildQuery(table: string) {
  const state: Record<string, any> = {};
  const api: any = {
    select: () => api,
    eq: (k: string, v: any) => { state[k] = v; return api; },
    order: () => api,
    maybeSingle: async () => {
      if (table === "tracking_links") return { data: LINK, error: null };
      if (table === "platform_accounts") return { data: { platforms: { name: "Estrela Bet" } }, error: null };
      if (table === "influencers") return { data: { slug: "camilly" }, error: null };
      return { data: null, error: null };
    },
    then: (resolve: any) => {
      // link_materials chain ends here (no maybeSingle)
      if (table === "link_materials") return resolve({ data: [], error: null });
      return resolve({ data: null, error: null });
    },
  };
  return api;
}

const channelStub = {
  on: () => channelStub,
  subscribe: () => channelStub,
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => buildQuery(t),
    channel: () => channelStub,
    removeChannel: () => {},
  },
}));

import { LinkMaterialEditor } from "../LinkMaterialEditor";

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LinkMaterialEditor open={true} onOpenChange={() => {}} trackingLinkId="tl-nogame" />
    </QueryClientProvider>,
  );
}

describe("LinkMaterialEditor · Kit da marca (link sem jogo)", () => {
  beforeEach(() => {
    downloadRawAsset.mockClear();
  });

  it("mostra o bloco 'Kit da marca · ativos isolados' e a nota de link sem jogo", async () => {
    renderEditor();
    expect(
      await screen.findByText(/kit da marca · ativos isolados/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/link sem jogo/i),
    ).toBeInTheDocument();
  });

  it("expõe 3 botões separados: PlayBet, plataforma e selo, + 'Baixar tudo'", async () => {
    renderEditor();
    await screen.findByText(/kit da marca · ativos isolados/i);

    // Botões nomeados individualmente
    const playbetBtn = screen.getByRole("button", { name: /playbet/i });
    const platformBtn = screen.getByRole("button", { name: /estrela bet/i });
    const sealBtn = screen.getByRole("button", { name: /^selo$/i });
    const allBtn = screen.getByRole("button", { name: /baixar tudo/i });

    expect(playbetBtn).toBeEnabled();
    expect(platformBtn).toBeEnabled();
    expect(sealBtn).toBeEnabled();
    expect(allBtn).toBeEnabled();
  });

  it("cada botão dispara downloadRawAsset com a URL do ativo correto", async () => {
    renderEditor();
    await screen.findByText(/kit da marca · ativos isolados/i);

    fireEvent.click(screen.getByRole("button", { name: /playbet/i }));
    fireEvent.click(screen.getByRole("button", { name: /estrela bet/i }));
    fireEvent.click(screen.getByRole("button", { name: /^selo$/i }));

    await waitFor(() => expect(downloadRawAsset).toHaveBeenCalledTimes(3));

    const urls = downloadRawAsset.mock.calls.map((c) => c[0]);
    expect(urls).toContain("/playbet-logo.png");
    expect(urls).toContain(BRAND_LOGO);
    expect(urls).toContain(BRAND_SEAL);
  });

  it("'Baixar tudo' dispara os 3 downloads em sequência", async () => {
    renderEditor();
    await screen.findByText(/kit da marca · ativos isolados/i);

    fireEvent.click(screen.getByRole("button", { name: /baixar tudo/i }));

    await waitFor(() => expect(downloadRawAsset).toHaveBeenCalledTimes(3), { timeout: 2000 });
    const urls = downloadRawAsset.mock.calls.map((c) => c[0]);
    expect(new Set(urls)).toEqual(new Set(["/playbet-logo.png", BRAND_LOGO, BRAND_SEAL]));
  });
});
