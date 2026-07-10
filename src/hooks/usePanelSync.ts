import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared realtime pulse for the Influencer/Manager panels.
 * Returns a monotonically-increasing `revision` that pages can use as a
 * useEffect dep to auto-refetch. One global channel per session, ref-counted.
 */
const TABLES = [
  "tracking_metrics",
  "tracking_events",
  "tracking_links",
  "link_materials",
  "saques",
  "notifications",
  "influencers",
] as const;

let globalRev = 0;
const listeners = new Set<(n: number) => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let lastPing = 0;

function bump() {
  const now = Date.now();
  if (now - lastPing < 400) return;
  lastPing = now;
  globalRev += 1;
  listeners.forEach((cb) => cb(globalRev));
}

function ensureChannel() {
  if (channel) return;
  channel = supabase.channel("panel-sync");
  for (const table of TABLES) {
    channel.on("postgres_changes" as any, { event: "*", schema: "public", table }, bump);
  }
  channel.subscribe();
}

function releaseChannel() {
  if (!channel || refCount > 0) return;
  supabase.removeChannel(channel);
  channel = null;
}

export function usePanelSync() {
  const [revision, setRevision] = useState(globalRev);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    refCount += 1;
    ensureChannel();
    const cb = (n: number) => {
      if (!mountedRef.current) return;
      setRevision(n);
      setLastSyncedAt(new Date());
    };
    listeners.add(cb);
    return () => {
      mountedRef.current = false;
      listeners.delete(cb);
      refCount = Math.max(0, refCount - 1);
      setTimeout(releaseChannel, 500);
    };
  }, []);

  return { revision, lastSyncedAt };
}
