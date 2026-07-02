import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Supabase mock ────────────────────────────────────────────────────────────
// Fixtures simulating the "Com LP" path: a landing page exists with a domain
// matching window.location.hostname, an active instance bound to an influencer,
// and an active tracking_link with click_id_param_name = "sub1".
const FIXTURE = {
  lp: {
    id: "lp-1",
    name: "Oportunidades",
    domain: "https://oportunidades.playbet.app.br",
  },
  instance: {
    id: "inst-1",
    slug: "camilly",
    landing_page_id: "lp-1",
    influencer_id: "inf-1",
    affiliate_link: "https://lkrh.pro/31d6",
    is_active: true,
  },
  influencer: { id: "inf-1", name: "Camilly" },
  trackingLink: { id: "tl-1", click_id_param_name: "sub1", base_url: "https://lkrh.pro/31d6" },
};

// Lightweight query builder that returns thenables for the chains used by the page.
function buildQuery(table: string) {
  const state: { filters: Record<string, any>; activeOnly: boolean } = { filters: {}, activeOnly: false };

  const resolveSingle = () => {
    if (table === "landing_pages") {
      // findLPBaseByHostname uses .select(...).eq("is_active", true) returning a list
      return { data: [FIXTURE.lp], error: null };
    }
    if (table === "landing_page_instances") {
      if (state.filters.slug === FIXTURE.instance.slug) return { data: FIXTURE.instance, error: null };
      return { data: null, error: null };
    }
    if (table === "tracking_links") {
      if (
        state.filters.landing_page_instance_id === FIXTURE.instance.id ||
        state.filters.influencer_id === FIXTURE.influencer.id
      ) {
        return { data: FIXTURE.trackingLink, error: null };
      }
      return { data: null, error: null };
    }
    if (table === "platform_hyped_games") {
      return { data: [], error: null };
    }
    if (table === "influencers") {
      if (state.filters.id === FIXTURE.influencer.id) return { data: FIXTURE.influencer, error: null };
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };

  const api: any = {
    select: () => api,
    eq: (col: string, val: any) => {
      state.filters[col] = val;
      return api;
    },
    in: () => api,
    not: () => api,
    order: () => api,
    limit: () => api,
    maybeSingle: async () => resolveSingle(),
    single: async () => resolveSingle(),
    insert: async () => ({ data: null, error: null }),
    // landing_pages flow ends with await (no maybeSingle) - make the chain thenable
    then: (resolve: any) => resolve(resolveSingle()),
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => buildQuery(table),
  },
}));

vi.mock("@/assets/logo.png", () => ({ default: "/logo.png" }));

import InfluencerLanding from "./InfluencerLanding";

describe("InfluencerLanding - Com LP end-to-end", () => {
  beforeEach(() => {
    // Match the LP domain so STRATEGY 1 (domain-aware) fires.
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        hostname: "oportunidades.playbet.app.br",
        href: "https://oportunidades.playbet.app.br/?ref=camilly&sub2=inf-1&sub3=camp-1",
      },
    });
  });

  it("loads the LP and CTA redirects to affiliate preserving sub2/sub3 + injecting sub1", async () => {
    render(
      <MemoryRouter initialEntries={["/?ref=camilly&sub2=inf-1&sub3=camp-1"]}>
        <Routes>
          <Route path="/" element={<InfluencerLanding />} />
          <Route path="/:slug" element={<InfluencerLanding />} />
        </Routes>
      </MemoryRouter>,
    );

    // LP renders the CTA after resolving the instance
    const cta = await waitFor(() => screen.getByRole("button", { name: /acessar oportunidades/i }));
    expect(cta).toBeEnabled();

    // Click CTA → window.location.href should become the affiliate URL with sub1/sub2/sub3
    fireEvent.click(cta);

    await waitFor(() => {
      const href = (window.location as any).href as string;
      expect(href.startsWith("https://lkrh.pro/31d6")).toBe(true);
      const u = new URL(href);
      expect(u.searchParams.get("sub2")).toBe("inf-1");
      expect(u.searchParams.get("sub3")).toBe("camp-1");
      expect(u.searchParams.get("sub1")).toMatch(/^clk_/);
    });
  });
});
