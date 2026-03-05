import { ShieldCheck, Plus } from "lucide-react";

const usuarios = [
  { nome: "Admin PlayBet", email: "admin@playbet.com", role: "Super Admin", ultimo: "05/03/2026 14:32", status: "Ativo" },
  { nome: "Maria Gestão", email: "maria@playbet.com", role: "Gestor Financeiro", ultimo: "05/03/2026 10:15", status: "Ativo" },
  { nome: "João Marketing", email: "joao@playbet.com", role: "Marketing", ultimo: "04/03/2026 18:20", status: "Ativo" },
  { nome: "Paulo Suporte", email: "paulo@playbet.com", role: "Suporte", ultimo: "03/03/2026 09:45", status: "Inativo" },
];

export default function UsuariosInternos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Usuários Internos</h1><p className="page-subtitle">Equipe interna da operação PlayBet</p></div>
        <button className="btn-primary"><Plus size={14} /> Novo Usuário</button>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Último Acesso</th><th>Status</th></tr></thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr key={i}>
                <td className="font-medium">{u.nome}</td>
                <td className="text-xs text-muted-foreground">{u.email}</td>
                <td><span className="badge-primary">{u.role}</span></td>
                <td className="text-xs">{u.ultimo}</td>
                <td><span className={u.status === "Ativo" ? "badge-success" : "badge-neutral"}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
