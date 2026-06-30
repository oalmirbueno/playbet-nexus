import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Eye, Copy, UserMinus, UserPlus, Shield, Check, X, Plus } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Perfil {
  id: number; nome: string; descricao: string; modulos: string[]; acoes: string[];
}

const initialPerfis: Perfil[] = [
  { id: 1, nome: "Admin Master", descricao: "Acesso total ao sistema", modulos: ["Todos"], acoes: ["Leitura", "Escrita", "Exclusão", "Configurações", "Aprovação"] },
  { id: 2, nome: "Sócio", descricao: "Visão financeira e operacional", modulos: ["Dashboard", "Financeiro", "Saques", "Comissões", "Analytics"], acoes: ["Leitura", "Aprovação"] },
  { id: 3, nome: "Financeiro", descricao: "Gestão de receitas e pagamentos", modulos: ["Financeiro", "Saques", "Comissões", "Asaas", "Regras Financeiras"], acoes: ["Leitura", "Escrita", "Aprovação"] },
  { id: 4, nome: "Operação", descricao: "Gestão de ativos e links", modulos: ["Jogos", "Plataformas", "Links", "LPs", "Hubs", "UTMs"], acoes: ["Leitura", "Escrita"] },
  { id: 5, nome: "Conteúdo", descricao: "Produção editorial e campanhas", modulos: ["Conteúdo", "Calendário", "Campanhas", "Estratégia"], acoes: ["Leitura", "Escrita"] },
  { id: 6, nome: "Influenciador", descricao: "Acesso limitado ao próprio perfil", modulos: ["Meu Perfil", "Meus Links", "Meus Saques"], acoes: ["Leitura"] },
  { id: 7, nome: "Visualização", descricao: "Somente leitura em todos os módulos", modulos: ["Todos (leitura)"], acoes: ["Leitura"] },
];

interface Usuario {
  id: number; nome: string; email: string; perfil: string; status: string; ultimoAcesso: string; modulosPermitidos: string[];
}

const initialUsuarios: Usuario[] = [
  { id: 1, nome: "Admin PlayBet", email: "admin@playbet.com", perfil: "Admin Master", status: "Ativo", ultimoAcesso: "05/03/2026 14:32", modulosPermitidos: ["Todos"] },
  { id: 2, nome: "Ricardo Almeida", email: "ricardo@playbet.com", perfil: "Sócio", status: "Ativo", ultimoAcesso: "05/03/2026 10:15", modulosPermitidos: ["Dashboard", "Financeiro", "Saques", "Comissões", "Analytics"] },
  { id: 3, nome: "Fernanda Rocha", email: "fernanda@playbet.com", perfil: "Sócio", status: "Ativo", ultimoAcesso: "04/03/2026 18:45", modulosPermitidos: ["Dashboard", "Financeiro", "Saques", "Comissões", "Analytics"] },
  { id: 4, nome: "Maria Santos", email: "maria@playbet.com", perfil: "Financeiro", status: "Ativo", ultimoAcesso: "04/03/2026 16:20", modulosPermitidos: ["Financeiro", "Saques", "Comissões", "Asaas", "Regras Financeiras"] },
  { id: 5, nome: "Lucas Martins", email: "lucas@playbet.com", perfil: "Operação", status: "Ativo", ultimoAcesso: "04/03/2026 14:10", modulosPermitidos: ["Jogos", "Plataformas", "Links", "LPs", "Hubs", "UTMs"] },
  { id: 6, nome: "Carla Lima", email: "carla@playbet.com", perfil: "Conteúdo", status: "Ativo", ultimoAcesso: "03/03/2026 11:30", modulosPermitidos: ["Conteúdo", "Calendário", "Campanhas", "Estratégia"] },
  { id: 7, nome: "João Viewer", email: "joao@playbet.com", perfil: "Visualização", status: "Inativo", ultimoAcesso: "01/03/2026 09:00", modulosPermitidos: ["Todos (leitura)"] },
];

const allModulos = ["Dashboard", "Financeiro", "Saques", "Comissões", "Asaas", "Influencers", "Sócios", "Usuários", "Jogos", "Plataformas", "Links", "LPs", "Templates", "Hubs", "Calendário", "Conteúdo", "Estratégia", "Campanhas", "Analytics", "Conversões", "UTMs", "Auditoria", "Configurações", "Regras Fin.", "Permissões", "Integrações"];

const matrizPerms: Record<string, Record<string, boolean>> = {
  "Admin Master": Object.fromEntries(allModulos.map(m => [m, true])),
  "Sócio": Object.fromEntries(allModulos.map(m => [m, ["Dashboard", "Financeiro", "Saques", "Comissões", "Analytics"].includes(m)])),
  "Financeiro": Object.fromEntries(allModulos.map(m => [m, ["Financeiro", "Saques", "Comissões", "Asaas", "Regras Fin."].includes(m)])),
  "Operação": Object.fromEntries(allModulos.map(m => [m, ["Jogos", "Plataformas", "Links", "LPs", "Templates", "Hubs", "UTMs"].includes(m)])),
  "Conteúdo": Object.fromEntries(allModulos.map(m => [m, ["Calendário", "Conteúdo", "Estratégia", "Campanhas"].includes(m)])),
  "Influenciador": Object.fromEntries(allModulos.map(m => [m, false])),
  "Visualização": Object.fromEntries(allModulos.map(m => [m, true])),
};

export default function Permissoes() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"usuarios" | "perfis" | "matriz">("usuarios");
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [userDetail, setUserDetail] = useState<Usuario | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Usuario> | null>(null);

  const filteredUsers = usuarios.filter(u => {
    if (search && !(u.nome + u.email + u.perfil).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const perfilNames = initialPerfis.map(p => p.nome);

  const openCreate = () => {
    setEditing({ id: 0, nome: "", email: "", perfil: "Visualização", status: "Ativo", ultimoAcesso: "-", modulosPermitidos: [] });
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing({ ...u });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.nome || !editing?.email) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }
    const perfil = initialPerfis.find(p => p.nome === editing.perfil);
    const modulos = perfil ? perfil.modulos : [];

    if (editing.id && editing.id > 0) {
      setUsuarios(prev => prev.map(u => u.id === editing.id ? { ...u, ...editing, modulosPermitidos: modulos } as Usuario : u));
      toast.success(`Usuário ${editing.nome} atualizado`);
    } else {
      const newUser: Usuario = {
        ...editing as Usuario,
        id: Date.now(),
        modulosPermitidos: modulos,
        ultimoAcesso: "-",
      };
      setUsuarios(prev => [...prev, newUser]);
      toast.success(`Usuário ${editing.nome} criado`);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const toggleStatus = (u: Usuario) => {
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === "Ativo" ? "Inativo" : "Ativo" } : x));
    toast.success(`Usuário ${u.status === "Ativo" ? "desativado" : "ativado"}`);
  };

  const cloneUser = (u: Usuario) => {
    const newUser = { ...u, id: Date.now(), nome: `${u.nome} (cópia)`, email: `copia-${u.email}` };
    setUsuarios(prev => [...prev, newUser]);
    toast.success("Usuário clonado");
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Permissões" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permissões</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de perfis, usuários e acessos - matriz de permissões completa</p>
        </div>
        <button className="btn-primary text-xs" onClick={openCreate}><UserPlus size={13} />Adicionar Usuário</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 border border-border rounded-md p-1 w-fit">
        {(["usuarios", "perfis", "matriz"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={t === tab ? "tab-btn-active" : "tab-btn"}>
            {t === "usuarios" ? "Usuários" : t === "perfis" ? "Perfis" : "Matriz"}
          </button>
        ))}
      </div>

      {/* Usuários Tab */}
      {tab === "usuarios" && (
        <>
          <input className="input-field w-72" placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="glass-card overflow-x-auto invisible-scroll">
            <table className="data-table">
              <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Status</th><th>Último Acesso</th><th>Módulos</th><th>Ações</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.nome}</td>
                    <td className="text-xs text-muted-foreground">{u.email}</td>
                    <td><span className="badge-primary">{u.perfil}</span></td>
                    <td><span className={u.status === "Ativo" ? "badge-success" : "badge-danger"}>{u.status}</span></td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">{u.ultimoAcesso}</td>
                    <td className="text-xs max-w-[200px] truncate">{u.modulosPermitidos.join(", ")}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setUserDetail(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Ver detalhe"><Eye size={13} className="text-muted-foreground" /></button>
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Editar"><Edit size={13} className="text-muted-foreground" /></button>
                        <button onClick={() => cloneUser(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Clonar perfil"><Copy size={13} className="text-muted-foreground" /></button>
                        <button onClick={() => toggleStatus(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title={u.status === "Ativo" ? "Desativar" : "Ativar"}><UserMinus size={13} className="text-muted-foreground" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Perfis Tab */}
      {tab === "perfis" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialPerfis.map(p => (
            <div key={p.id} className="glass-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield size={16} className="text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">{p.nome}</h3>
                  <p className="text-[11px] text-muted-foreground">{p.descricao}</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">Módulos</p>
                <div className="flex flex-wrap gap-1">{p.modulos.map(m => <span key={m} className="badge-neutral">{m}</span>)}</div>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">Ações</p>
                <div className="flex flex-wrap gap-1">{p.acoes.map(a => <span key={a} className="badge-info">{a}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Matriz Tab */}
      {tab === "matriz" && (
        <div className="glass-card overflow-x-auto invisible-scroll">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Matriz de Permissões - Módulos × Perfis</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card z-10">Módulo</th>
                {Object.keys(matrizPerms).map(p => <th key={p} className="text-center whitespace-nowrap">{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {allModulos.map(m => (
                <tr key={m}>
                  <td className="font-medium sticky left-0 bg-card text-xs">{m}</td>
                  {Object.keys(matrizPerms).map(p => (
                    <td key={p} className="text-center">
                      {matrizPerms[p][m] ? <Check size={14} className="text-success mx-auto" /> : <X size={14} className="text-muted-foreground/30 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit User Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Usuário" : "Adicionar Usuário"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Email *</label><input className="input-field mt-1" type="email" value={editing?.email || ""} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Perfil</label>
                <select className="select-field mt-1 w-full" value={editing?.perfil || ""} onChange={e => setEditing(p => ({ ...p, perfil: e.target.value }))}>
                  {perfilNames.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value }))}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!userDetail} onOpenChange={() => setUserDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Detalhe do Usuário</DialogTitle></DialogHeader>
          {userDetail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: "Nome", v: userDetail.nome }, { l: "Email", v: userDetail.email },
                  { l: "Perfil", v: userDetail.perfil }, { l: "Status", v: userDetail.status },
                  { l: "Último Acesso", v: userDetail.ultimoAcesso },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{f.l}</p>
                    <p className="text-sm font-medium">{f.v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">Módulos Permitidos</p>
                <div className="flex flex-wrap gap-1">{userDetail.modulosPermitidos.map(m => <span key={m} className="badge-neutral">{m}</span>)}</div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button className="btn-ghost text-xs" onClick={() => { setUserDetail(null); navigate("/auditoria"); }}>Ver Histórico</button>
                <button className="btn-ghost text-xs" onClick={() => { setUserDetail(null); openEdit(userDetail); }}>Editar Permissões</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
