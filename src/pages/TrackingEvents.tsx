import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

import { useTrackingEvents, usePlatformAccounts } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Zap, Filter, RefreshCcw, Eye, Search, Copy, Check } from "lucide-react";
import type { TrackingEventRow } from "@/services/trackingService";
import { useToast } from "@/hooks/use-toast";

const CANONICAL_EVENTS = [
  "lp_view", "click", "registration", "ftd", "deposit", "redeposit",
  "revenue", "withdrawable_revenue", "app_install", "qualified_player",
];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function TrackingEvents() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TrackingEventRow | null>(null);
  const [copiedField, setCopiedField] = useState("");
  const { toast } = useToast();

  const filters = useMemo(() => ({
    platform_id: platformFilter !== "all" ? platformFilter : undefined,
    canonical_event_name: eventFilter !== "all" ? eventFilter : undefined,
    source_type: sourceFilter !== "all" ? sourceFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [platformFilter, eventFilter, sourceFilter, dateFrom, dateTo]);

  const { data: events, isLoading } = useTrackingEvents(filters);
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();

  // Client-side text search for transaction_id / click_id
  const filteredEvents = useMemo(() => {
    if (!searchText) return events;
    const q = searchText.toLowerCase();
    return events.filter(e =>
      (e.transaction_id || "").toLowerCase().includes(q) ||
      (e.click_id || "").toLowerCase().includes(q) ||
      (e.platform_user_id || "").toLowerCase().includes(q)
    );
  }, [events, searchText]);

  const getPlatformName = (id: string | null) => {
    if (!id) return "-";
    return (platforms as any[]).find((p: any) => p.id === id)?.name || id.slice(0, 8);
  };

  const getAccountName = (id: string | null) => {
    if (!id) return "-";
    return accounts.find(a => a.id === id)?.nome_conta || id.slice(0, 8);
  };

  const stats = useMemo(() => {
    const visits = filteredEvents.filter(e => e.canonical_event_name === "lp_view");
    const outboundClicks = filteredEvents.filter(e => e.canonical_event_name === "click");
    const conversions = filteredEvents.filter(e =>
      !["lp_view", "click"].includes(e.canonical_event_name)
    );
    const uniqueVisitors = new Set(visits.map(e => e.click_id).filter(Boolean)).size;
    const uniqueClickIds = new Set(outboundClicks.map(e => e.click_id).filter(Boolean)).size;
    const ctr = visits.length > 0 ? (outboundClicks.length / visits.length) * 100 : 0;
    return {
      total: filteredEvents.length,
      visits: visits.length,
      uniqueVisitors,
      outboundClicks: outboundClicks.length,
      uniqueClickIds,
      ctr,
      conversions: conversions.length,
      duplicates: filteredEvents.filter(e => e.is_duplicate).length,
      noClickId: filteredEvents.filter(e => !e.click_id && !["click", "lp_view"].includes(e.canonical_event_name)).length,
      totalAmount: filteredEvents.reduce((s, e) => s + (e.amount || 0), 0),
    };
  }, [filteredEvents]);

  const clearFilters = () => {
    setPlatformFilter("all"); setEventFilter("all");
    setSourceFilter("all"); setDateFrom(""); setDateTo("");
    setSearchText("");
  };

  const copyField = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({ title: `${label} copiado` });
    setTimeout(() => setCopiedField(""), 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Eventos" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Eventos de Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Universal · qualquer casa de aposta · postback, API ou import manual</p>
        </div>
      </div>

      {/* Funnel stats — separação clara entre visita, clique de saída e conversão */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className={`cursor-pointer transition-all ${eventFilter === "lp_view" ? "ring-2 ring-primary" : "hover:border-primary/40"}`}
          onClick={() => setEventFilter(eventFilter === "lp_view" ? "all" : "lp_view")}
        >
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Visitas · lp_view</p>
            <p className="text-2xl font-bold text-blue-500 leading-tight">{stats.visits}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.uniqueVisitors} únicos</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${eventFilter === "click" ? "ring-2 ring-primary" : "hover:border-primary/40"}`}
          onClick={() => setEventFilter(eventFilter === "click" ? "all" : "click")}
        >
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cliques de saída · click</p>
            <p className="text-2xl font-bold text-emerald-500 leading-tight">{stats.outboundClicks}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">CTR {stats.ctr.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversões</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{stats.conversions}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">registro · FTD · depósito</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Valor total</p>
            <p className="text-2xl font-bold leading-tight">{fmt(stats.totalAmount)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.duplicates} dup · {stats.noClickId} sem CID</p>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={clearFilters}>
              <RefreshCcw size={12} className="mr-1" /> Limpar
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Evento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos eventos</SelectItem>
                {CANONICAL_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="postback">Postback</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" className="h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 text-xs pl-8" placeholder="transaction_id / click_id..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && events.length === 0 && (
        <EmptyState
          icon={Zap}
          title="Nenhum evento real recebido ainda"
          description="Os eventos chegam automaticamente via postback quando a plataforma é configurada. Faça um teste de postback para validar a integração, ou confira os dados demo no filtro Demo."
          actionLabel="Configurar Mapeamentos"
          onAction={() => window.location.href = "/tracking/mappings"}
        />
      )}

      {!isLoading && events.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Evento Raw</TableHead>
                    <TableHead>Canônico</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Click ID</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.slice(0, 100).map(ev => (
                    <TableRow key={ev.id} className={ev.is_duplicate ? "opacity-50" : ""}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(ev.event_timestamp).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">{getPlatformName(ev.platform_id)}</TableCell>
                      <TableCell className="text-xs">{getAccountName(ev.platform_account_id)}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.raw_event_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            ev.canonical_event_name === "lp_view"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                              : ev.canonical_event_name === "click"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : ""
                          }`}
                        >
                          {ev.canonical_event_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[100px] truncate">{ev.transaction_id || "-"}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[100px] truncate">{ev.click_id || "-"}</TableCell>
                      <TableCell className="text-right">{ev.amount ? fmt(ev.amount) : "-"}</TableCell>
                      <TableCell className="text-xs">{ev.currency || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{ev.source_type}</Badge></TableCell>
                      <TableCell>
                        {ev.is_duplicate && <Badge variant="destructive" className="text-[10px]">Dup</Badge>}
                        {ev.is_demo && !ev.is_duplicate && <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-600">Demo</Badge>}
                        {!ev.click_id && !ev.is_duplicate && !ev.is_demo && ev.canonical_event_name !== "click" && (
                          <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">No CID</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedEvent(ev)}>
                          <Eye size={13} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredEvents.length > 100 && (
              <div className="text-center py-3 text-xs text-muted-foreground border-t">
                Mostrando 100 de {filteredEvents.length} eventos. Use os filtros para refinar.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payload Inspector */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Evento:</span> <span className="font-medium">{selectedEvent.canonical_event_name}</span></div>
                <div><span className="text-muted-foreground">Raw:</span> <span className="font-mono">{selectedEvent.raw_event_name}</span></div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Click ID:</span>
                  <span className="font-mono text-xs">{selectedEvent.click_id || "-"}</span>
                  {selectedEvent.click_id && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyField(selectedEvent.click_id!, "Click ID")}>
                      {copiedField === "Click ID" ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Transaction:</span>
                  <span className="font-mono text-xs">{selectedEvent.transaction_id || "-"}</span>
                  {selectedEvent.transaction_id && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyField(selectedEvent.transaction_id!, "Transaction ID")}>
                      {copiedField === "Transaction ID" ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                    </Button>
                  )}
                </div>
                <div><span className="text-muted-foreground">Valor:</span> {selectedEvent.amount ? fmt(selectedEvent.amount) : "-"}</div>
                <div><span className="text-muted-foreground">Comissão:</span> {selectedEvent.commission_amount ? fmt(selectedEvent.commission_amount) : "-"}</div>
                <div><span className="text-muted-foreground">Moeda:</span> {selectedEvent.currency || "-"}</div>
                <div><span className="text-muted-foreground">País:</span> {selectedEvent.country || "-"}</div>
                <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{selectedEvent.platform_user_id || "-"}</span></div>
                <div><span className="text-muted-foreground">Plataforma:</span> {getPlatformName(selectedEvent.platform_id)}</div>
                <div><span className="text-muted-foreground">Conta:</span> {getAccountName(selectedEvent.platform_account_id)}</div>
                <div><span className="text-muted-foreground">Origem:</span> {selectedEvent.source_type}</div>
                <div><span className="text-muted-foreground">Duplicado:</span> {selectedEvent.is_duplicate ? "Sim" : "Não"}</div>
                <div><span className="text-muted-foreground">Demo:</span> {selectedEvent.is_demo ? "Sim" : "Não"}</div>
              </div>
              {/* Universal payload preview */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Metadados recebidos</p>
                {(() => {
                  const payload = (selectedEvent.raw_payload as Record<string, any>) || {};
                  const flatEntries = Object.entries({ ...payload, ...(payload._platform_meta || {}) })
                    .filter(([k, v]) => k !== "_platform_meta" && (typeof v === "string" || typeof v === "number"))
                    .slice(0, 12);
                  if (flatEntries.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">Nenhum metadado adicional.</p>;
                  }
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm border rounded-md p-3 bg-muted/30">
                      {flatEntries.map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1 min-w-0">
                          <span className="text-muted-foreground text-xs shrink-0">{k}:</span>
                          <span className="font-mono text-xs truncate">{String(v)}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyField(String(v), k)}>
                            {copiedField === k ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Raw Payload (debug)</p>
                <pre className="bg-secondary/50 rounded-md p-3 text-xs overflow-auto max-h-[300px] font-mono">
                  {JSON.stringify(selectedEvent.raw_payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
