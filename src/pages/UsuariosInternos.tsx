import { ShieldCheck, Plus, Users } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function UsuariosInternos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Usuários Internos</h1><p className="page-subtitle">Equipe interna da operação PlayBet</p></div>
        <button className="btn-primary"><Plus size={14} /> Novo Usuário</button>
      </div>
      <div className="glass-card">
        <EmptyState
          icon={Users}
          title="Nenhum usuário cadastrado"
          description="Os membros da equipe interna serão listados aqui após configuração da autenticação e permissões."
        />
      </div>
    </div>
  );
}
