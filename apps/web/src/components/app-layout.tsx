import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Building2, ClipboardList, Home, LogOut, Menu, Megaphone, Trash2, X } from "lucide-react";
import { logout, getUser } from "../services/auth";
import {
  listNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
  excluirNotificacao,
  type Notificacao,
  AVISO_TIPO_COLORS,
  type AvisoTipo,
} from "../services/avisos";

const navLinks = [
  { label: "Dashboard",   path: "/dashboard",   icon: Home },
  { label: "Avisos",      path: "/avisos",       icon: Megaphone },
  { label: "Ocorrências", path: "/ocorrencias",  icon: ClipboardList },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const nav = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Notificações ──────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.lida).length;

  function loadNotifs() {
    listNotificacoes().then(setNotifs).catch(() => {});
  }

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000); // poll a cada 30s
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarcarLida(id: string) {
    await marcarNotificacaoLida(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n));
  }

  async function handleExcluir(id: string) {
    await excluirNotificacao(id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleMarcarTodas() {
    await marcarTodasLidas();
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  function sair() {
    logout();
    nav("/login");
  }

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "U";

  const SidebarContent = () => (
    <>
      {/* Logo + Bell */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <span className="font-bold text-sm text-gray-900 leading-none flex-1">Condomínio</span>

        {/* Sininho de notificações */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer border-none bg-transparent transition-colors"
            title="Notificações"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Dropdown de notificações */}
          {bellOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">Notificações</span>
                  {unread > 0 && (
                    <span className="text-[11px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                      {unread} nova{unread !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={handleMarcarTodas}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Bell size={24} className="text-gray-200" />
                    <p className="text-xs text-gray-400">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${n.lida ? "bg-white" : "bg-indigo-50/40"}`}
                    >
                      {/* Dot não lida */}
                      <div className="shrink-0 mt-1">
                        {n.lida
                          ? <div className="w-2 h-2 rounded-full bg-gray-200" />
                          : <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        }
                      </div>

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => { handleMarcarLida(n.id); setBellOpen(false); nav("/avisos"); }}
                      >
                        {n.aviso_tipo && (
                          <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${AVISO_TIPO_COLORS[n.aviso_tipo as AvisoTipo] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {n.aviso_tipo}
                          </span>
                        )}
                        <p className="text-xs font-semibold text-gray-800 mt-0.5 leading-tight line-clamp-2">
                          {n.aviso_titulo ?? "Novo aviso publicado"}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!n.lida && (
                          <button
                            onClick={() => handleMarcarLida(n.id)}
                            title="Marcar como lida"
                            className="p-1 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border-none bg-transparent transition-colors text-[10px] font-semibold"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => handleExcluir(n.id)}
                          title="Remover"
                          className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 cursor-pointer border-none bg-transparent transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
        {navLinks.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { nav(path); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none text-left w-full transition-colors
                ${active
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
            >
              <Icon size={17} className={active ? "text-indigo-600" : "text-gray-400"} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User block */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{user?.name ?? "Usuário"}</p>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
              {user?.role === "ADMIN" ? "Administrador" : "Morador"}
            </p>
          </div>
          <button
            onClick={sair}
            title="Sair"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 cursor-pointer border-none bg-transparent transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer border-none bg-transparent"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 h-16 px-4 md:px-8 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer border-none bg-transparent"
          >
            <Menu size={20} />
          </button>
          <h1 className="m-0 text-base font-semibold text-gray-800 truncate">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
