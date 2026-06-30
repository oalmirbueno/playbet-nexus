import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { useTrackingSnapshots } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Camera, Eye } from "lucide-react";
import type { TrackingSnapshotRow } from "@/services/trackingService";


function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function TrackingSnapshots() {
  const { data, isLoading } = useTrackingSnapshots();
  const { data: platforms } = usePlatforms();
  const [selected, setSelected] = useState<TrackingSnapshotRow | null>(null);

  const getPlatformName = (id: string | null) => {
    if (!id) return "-";
    return (platforms as any[]).find((p: any) => p.id === id)?.name || id.slice(0, 8);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Snapshots" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Snapshots</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Histórico de snapshots importados de dashboards externos</p>
        </div>
        
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <EmptyState
          icon={Camera}
          title="Nenhum snapshot registrado"
          description="Snapshots são registros pontuais de dados extraídos de dashboards externos."
        />
      )}

      {!isLoading && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">FTD</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.data_snapshot).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-muted-foreground">{s.hora_snapshot || "-"}</TableCell>
                    <TableCell>{getPlatformName(s.platform_id)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{s.snapshot_type || "manual"}</Badge></TableCell>
                    <TableCell className="text-right">{s.cliques}</TableCell>
                    <TableCell className="text-right">{s.registros}</TableCell>
                    <TableCell className="text-right">{s.ftd}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(s.revenue)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{s.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(s)}>
                        <Eye size={13} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Snapshot - {selected?.data_snapshot}</DialogTitle></DialogHeader>
          {selected && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Raw Payload</p>
              <pre className="bg-secondary/50 rounded-md p-3 text-xs overflow-auto max-h-[400px] font-mono">
                {JSON.stringify(selected.raw_payload, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
