import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CycleStatus = "landed" | "available" | "consumed" | "cancelled";

export interface WithdrawalCycle {
  id: string;
  target_type: "influencer" | "manager";
  target_id: string;
  amount: number;
  landed_at: string;
  available_at: string;
  status: CycleStatus;
  source: string | null;
  reference: string | null;
  consumed_amount: number;
  notes: string | null;
  created_at: string;
}

export interface WithdrawalSummary {
  available: number;      // ready to withdraw now
  pending: number;        // landed but not yet released
  requested: number;      // saques not paid/cancelled
  paid: number;           // saques marked pago
  nextReleaseAt: string | null;
}

interface Args {
  targetType: "influencer" | "manager";
  targetId: string | null | undefined;
}

export function useWithdrawalData({ targetType, targetId }: Args) {
  const [cycles, setCycles] = useState<WithdrawalCycle[]>([]);
  const [saques, setSaques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!targetId) {
      setCycles([]);
      setSaques([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const foreignKey = targetType === "influencer" ? "influencer_id" : "manager_id";
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase
        .from("withdrawal_cycles")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("landed_at", { ascending: false }),
      supabase
        .from("saques")
        .select("*")
        .eq(foreignKey, targetId)
        .order("created_at", { ascending: false }),
    ]);
    setCycles((c ?? []) as WithdrawalCycle[]);
    setSaques(s ?? []);
    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => { reload(); }, [reload]);

  const activeCycles = cycles.filter((c) => c.status !== "cancelled");
  const availableCycles = activeCycles.filter((c) => c.status === "available");
  const landedCycles = activeCycles.filter((c) => c.status === "landed");

  const availableTotal = availableCycles.reduce(
    (a, c) => a + Math.max(0, Number(c.amount) - Number(c.consumed_amount)),
    0,
  );
  const pendingTotal = landedCycles.reduce((a, c) => a + Number(c.amount), 0);

  const requestedTotal = saques.reduce((a: number, s: any) => {
    const st = (s.status ?? "").toLowerCase();
    return ["cancelado", "recusado", "falhou", "failed"].includes(st) ? a : a + Number(s.valor ?? 0);
  }, 0);
  const paidTotal = saques.reduce((a: number, s: any) => {
    const st = (s.status ?? "").toLowerCase();
    return ["pago", "completed", "concluido"].includes(st) ? a + Number(s.valor ?? 0) : a;
  }, 0);

  const nextRelease = landedCycles.length
    ? landedCycles
        .map((c) => c.available_at)
        .sort()
        .at(0) ?? null
    : null;

  const summary: WithdrawalSummary = {
    available: Math.max(0, availableTotal),
    pending: pendingTotal,
    requested: requestedTotal,
    paid: paidTotal,
    nextReleaseAt: nextRelease,
  };

  return {
    loading,
    cycles: activeCycles,
    availableCycles,
    landedCycles,
    saques,
    summary,
    reload,
  };
}
