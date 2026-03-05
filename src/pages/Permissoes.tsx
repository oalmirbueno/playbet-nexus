const permissoes = [
  { role: "Super Admin", modulos: "Todos", acoes: "Leitura, Escrita, Exclusão, Configurações", users: 1 },
  { role: "Gestor Financeiro", modulos: "Financeiro, Saques, Comissões, Asaas", acoes: "Leitura, Escrita, Aprovação", users: 1 },
  { role: "Marketing", modulos: "Conteúdo, Campanhas, LPs, Links, Calendário", acoes: "Leitura, Escrita", users: 1 },
  { role: "Suporte", modulos: "Influencers, Saques (leitura)", acoes: "Leitura", users: 1 },
];

export default function Permissoes() {
  return (
    <div className="space-y-6">
      <div><h1 className="page-header">Permissões</h1><p className="page-subtitle">Gestão de permissões e funções de acesso</p></div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Função</th><th>Módulos Acessíveis</th><th>Ações Permitidas</th><th>Usuários</th></tr></thead>
          <tbody>
            {permissoes.map((p, i) => (
              <tr key={i}>
                <td><span className="badge-primary">{p.role}</span></td>
                <td className="text-xs max-w-[300px]">{p.modulos}</td>
                <td className="text-xs">{p.acoes}</td>
                <td>{p.users}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
