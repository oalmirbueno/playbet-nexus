import { useParams, Link, Navigate } from "react-router-dom";
import { getBrandKit, listBrands, BrandKey, isBrandLegallyReady } from "@/lib/brandRegistry";
import { BrandFooterSeal } from "@/components/brand/BrandFooterSeal";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, AlertTriangle, Palette, Type } from "lucide-react";

/**
 * Showcase público do kit de marca de uma plataforma.
 * Rota: /marca/:brand — mostra logos, selo, paleta, tipografia.
 * Fonte única da verdade pra time de tráfego não misturar assets.
 */
export default function BrandShowcase() {
  const { brand: key } = useParams<{ brand: string }>();
  const brand = (() => {
    try { return getBrandKit(key as BrandKey); } catch { return null; }
  })();

  if (!brand) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <Link to="/marcas" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Todas as marcas
        </Link>
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-semibold">Marca não encontrada</h1>
          <p className="text-muted-foreground mt-2">Registro: {key}</p>
        </div>
      </div>
    );
  }

  const ready = isBrandLegallyReady(brand);

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: brand.palette.surface,
        color: brand.palette.ink,
        fontFamily: brand.typography.body,
      }}
    >
      <div className="max-w-6xl mx-auto p-8 space-y-10">
        <div className="flex items-center justify-between">
          <Link to="/marcas" className="text-xs uppercase tracking-widest opacity-70 hover:opacity-100 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Marcas
          </Link>
          <Badge variant={ready ? "secondary" : "destructive"} className="gap-1.5">
            {ready ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {ready ? "Kit legalmente pronto" : "Sem selo legal — bloqueado"}
          </Badge>
        </div>

        <header className="border-b pb-8" style={{ borderColor: brand.palette.primary + "33" }}>
          <div style={{ fontFamily: brand.typography.display }} className="text-6xl font-bold">
            {brand.name}
          </div>
          {brand.seal?.license && (
            <div className="mt-2 text-sm opacity-70">{brand.seal.license}</div>
          )}
        </header>

        {/* Logos */}
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest opacity-70">Logos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(brand.logos).filter(([, v]) => !!v).map(([label, url]) => (
              <div key={label} className="rounded-lg p-6 flex flex-col items-center gap-3"
                style={{ background: brand.palette.primaryContrast, color: brand.palette.surface }}>
                <img src={url as string} alt={label} className="h-16 object-contain max-w-full" />
                <div className="text-[10px] uppercase tracking-widest opacity-60">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Paleta */}
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest opacity-70 inline-flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Paleta</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { name: "Primary", hex: brand.palette.primary },
              { name: "Contrast", hex: brand.palette.primaryContrast },
              { name: "Secondary", hex: brand.palette.secondary },
              { name: "Surface", hex: brand.palette.surface },
              { name: "Ink", hex: brand.palette.ink },
            ].map(c => (
              <div key={c.name} className="rounded-lg overflow-hidden border" style={{ borderColor: brand.palette.primary + "22" }}>
                <div className="h-20" style={{ background: c.hex }} />
                <div className="p-3 text-xs" style={{ background: brand.palette.primaryContrast, color: brand.palette.surface }}>
                  <div className="font-semibold">{c.name}</div>
                  <div className="opacity-60 font-mono text-[10px]">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
          {brand.palette.backgrounds.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {brand.palette.backgrounds.map(bg => (
                <div key={bg.name} className="rounded-lg h-32 flex items-end p-3 border" style={{ background: bg.url ? `url(${bg.url}) center/cover` : bg.hex, borderColor: brand.palette.primary + "22" }}>
                  <span className="text-[11px] font-semibold px-2 py-1 rounded" style={{ background: brand.palette.surface + "cc", color: brand.palette.ink }}>{bg.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tipografia */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest opacity-70 inline-flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Tipografia</h2>
          <div className="rounded-lg p-6 space-y-3" style={{ background: brand.palette.primaryContrast, color: brand.palette.surface }}>
            <div style={{ fontFamily: brand.typography.display }} className="text-4xl font-bold">Display · {brand.typography.display.split(",")[0]}</div>
            <div style={{ fontFamily: brand.typography.body }} className="text-base opacity-80">Body · {brand.typography.body.split(",")[0]}. Este é o corpo de texto padrão para materiais e landing pages desta marca.</div>
          </div>
        </section>

        {/* Selo legal */}
        {brand.seal && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest opacity-70">Selo legal</h2>
            <div className="rounded-lg p-6" style={{ background: brand.palette.primaryContrast }}>
              <BrandFooterSeal brand={brand} variant="horizontal" tone="dark" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** Índice de marcas — lista todas as plataformas registradas. */
export function BrandIndex() {
  const brands = listBrands();
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-semibold mb-8">Marcas</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {brands.map(b => {
          const ready = isBrandLegallyReady(b);
          return (
            <Link key={b.key} to={`/marca/${b.key}`}
              className="rounded-xl border border-border/60 p-6 hover:border-primary/60 transition-colors flex flex-col gap-3"
              style={{ background: b.palette.surface, color: b.palette.ink }}>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: b.typography.display }} className="text-2xl font-bold">{b.name}</span>
                <Badge variant={ready ? "secondary" : "destructive"} className="text-[10px]">
                  {ready ? "OK" : "Sem selo"}
                </Badge>
              </div>
              {b.logos.mark && <img src={b.logos.mark} alt="" className="h-10 self-start object-contain" />}
              {b.seal?.license && <span className="text-[10px] opacity-70">{b.seal.license}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Fallback pra rota antiga. */
export function BrandRedirect() {
  return <Navigate to="/marcas" replace />;
}
