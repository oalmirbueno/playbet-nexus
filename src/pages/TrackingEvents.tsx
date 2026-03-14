import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { useTrackingEvents } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Zap, Filter, RefreshCcw, Eye } from "lucide-react";
import type { TrackingEventRow } from "@/services/trackingService";
import TrackingDemoFilter from "@/components/TrackingDemoFilter";

const CANONICAL_EVENTS = [
  "click", "registration", "ftd", "deposit", "redeposit",
  "revenue", "withdrawable_revenue", "app_install", "qualified_player",
];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function TrackingEvents() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TrackingEventRow | null>(null);

  const filters = useMemo(() => ({
    platform_id: platformFilter !== "all" ? platformFilter : undefined,
    canonical_event_name: eventFilter !== "all" ? eventFilter : undefined,
    source_type: sourceFilter !== "all" ? sourceFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [platformFilter, eventFilter, sourceFilter, dateFrom, dateTo]);

  const { data: events, isLoading } = useTrackingEvents(filters);
  const { data: platforms } = usePlatforms();

  const getPlatformName = (id: string | null) => {
    if (!id) return "—";
    return (platforms as any[]).find((p: any) => p.id === id)?.name || id.slice(0, 8);
  };

  const stats = useMemo(() => ({
    total: events.length,
    duplicates: events.filter(e => e.is_duplicate).length,
    noClickId: events.filter(e => !e.click_id && e.canonical_event_name !== "click").length,
    totalAmount: events.reduce((s, e) => s + (e.amount || 0), 0),
  }), [events]);

  const clearFilters = () => {
    setPlatformFilter("all"); setEventFilter("all");
    setSourceFilter("all"); setDateFrom(""); setDateTo("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Eventos" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Eventos de Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Eventos brutos recebidos via postback, API ou importação manual</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="py-3 px-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Total</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Duplicados</p>
          <p className="text-lg font-bold text-yellow-500">{stats.duplicates}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Sem click_id</p>
          <p className="text-lg font-bold text-orange-500">{stats.noClickId}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 px-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Valor Total</p>
          <p className="text-lg font-bold">{fmt(stats.totalAmount)}</p>
        </CardContent></Card>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          </div>
        </CardContent>
      </Card>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && events.length === 0 && (
        <EmptyState
          icon={Zap}
          title="Nenhum evento registrado"
          description="Configure postbacks nas plataformas para começar a receber eventos automaticamente."
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
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Evento Raw</TableHead>
                    <TableHead>Canônico</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Click ID</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(ev => (
                    <TableRow key={ev.id} className={ev.is_duplicate ? "opacity-50" : ""}>
                      <TableCell className="text-xs">{getPlatformName(ev.platform_id)}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.raw_event_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{ev.canonical_event_name}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{ev.source_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{ev.click_id || "—"}</TableCell>
                      <TableCell className="text-right">{ev.amount ? fmt(ev.amount) : "—"}</TableCell>
                      <TableCell>{ev.country || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(ev.event_timestamp).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        {ev.is_duplicate && <Badge variant="destructive" className="text-[10px]">Dup</Badge>}
                        {!ev.click_id && !ev.is_duplicate && ev.canonical_event_name !== "click" && (
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
          </CardContent>
        </Card>
      )}

      {/* Payload Inspector */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Evento:</span> <span className="font-medium">{selectedEvent.canonical_event_name}</span></div>
                <div><span className="text-muted-foreground">Raw:</span> <span className="font-mono">{selectedEvent.raw_event_name}</span></div>
                <div><span className="text-muted-foreground">Click ID:</span> <span className="font-mono">{selectedEvent.click_id || "—"}</span></div>
                <div><span className="text-muted-foreground">Transaction:</span> <span className="font-mono">{selectedEvent.transaction_id || "—"}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> {selectedEvent.amount ? fmt(selectedEvent.amount) : "—"}</div>
                <div><span className="text-muted-foreground">Comissão:</span> {selectedEvent.commission_amount ? fmt(selectedEvent.commission_amount) : "—"}</div>
                <div><span className="text-muted-foreground">País:</span> {selectedEvent.country || "—"}</div>
                <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{selectedEvent.platform_user_id || "—"}</span></div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Raw Payload</p>
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
