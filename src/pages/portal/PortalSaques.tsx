import { Wallet } from "lucide-react";

export default function PortalSaques() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Saques</h1>
        <p className="page-subtitle">Solicite e acompanhe seus saques.</p>
      </div>

      <div className="glass-card p-8 text-center">
        <Wallet className="mx-auto mb-3 text-muted-foreground" size={22} />
        <p className="text-sm font-medium">Solicitação de saque em breve</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Estamos finalizando a integração com o Asaas para PIX automático. Enquanto isso, fale com sua gerência.
        </p>
      </div>
    </div>
  );
}
