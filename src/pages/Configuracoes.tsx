import { Save } from "lucide-react";

export default function Configuracoes() {
  const inputClass = "w-full bg-secondary text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const labelClass = "text-sm text-muted-foreground mb-1 block";

  return (
    <div>
      <h1 className="page-header">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Informações da Plataforma</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nome da Plataforma</label>
              <input className={inputClass} defaultValue="PlayBet" />
            </div>
            <div>
              <label className={labelClass}>E-mail de Contato</label>
              <input className={inputClass} defaultValue="admin@playbet.com" />
            </div>
            <div>
              <label className={labelClass}>Domínio Principal</label>
              <input className={inputClass} defaultValue="https://playbet.com" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Comissões Padrão</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Comissão Influencer (%)</label>
              <input className={inputClass} defaultValue="15" type="number" />
            </div>
            <div>
              <label className={labelClass}>Saque Mínimo (R$)</label>
              <input className={inputClass} defaultValue="100" type="number" />
            </div>
            <div>
              <label className={labelClass}>Dias para Pagamento</label>
              <input className={inputClass} defaultValue="30" type="number" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Save size={16} /> Salvar Configurações
        </button>
      </div>
    </div>
  );
}
