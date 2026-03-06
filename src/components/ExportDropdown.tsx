import { Download, FileText, FileJson } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { exportToCSV, exportToJSON } from "@/lib/export";
import { toast } from "@/hooks/use-toast";

interface ExportDropdownProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  label?: string;
}

export default function ExportDropdown<T extends Record<string, unknown>>({ data, filename, label = "Exportar" }: ExportDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleExport = (format: "csv" | "json") => {
    if (!data.length) {
      toast({ title: "Sem dados", description: "Nenhum dado disponível para exportar.", variant: "destructive" });
      return;
    }
    if (format === "csv") exportToCSV(data, filename);
    else exportToJSON(data, filename);
    toast({ title: "Exportado!", description: `Arquivo ${filename}.${format} gerado com sucesso.` });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn-secondary" onClick={() => setOpen(!open)}>
        <Download size={14} /> {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] animate-fade-in">
          <button onClick={() => handleExport("csv")} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-foreground">
            <FileText size={14} className="text-muted-foreground" /> Exportar CSV
          </button>
          <button onClick={() => handleExport("json")} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-foreground">
            <FileJson size={14} className="text-muted-foreground" /> Exportar JSON
          </button>
        </div>
      )}
    </div>
  );
}
