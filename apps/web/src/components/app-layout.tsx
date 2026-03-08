import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Building2, CheckCheck, ClipboardList, Home, LogOut, Menu, Megaphone, Moon, Settings, User, X } from "lucide-react";
import { logout, getUser } from "../services/auth";
import {
  listNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
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
  const [bellPos, setBellPos] = useState({ top: 0, left: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.lida).length;

  const loadNotifs = useCallback(() => {
    listNotificacoes().then(setNotifs).catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  function openBell() {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setBellPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 336) });
    }
    setBellOpen((v) => !v);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Marcar como lida E remover da lista
  async function handleMarcarLida(id: string) {
    await marcarNotificacaoLida(id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleMarcarTodas() {
    await marcarTodasLidas();
    setNotifs([]);
  }

  // ── Gear (configurações) ──────────────────────────────────────────────
  const [gearOpen, setGearOpen] = useState(false);
  const gearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) setGearOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
      <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <span className="font-bold text-sm text-gray-900 leading-none flex-1">OmniLar</span>

        {/* Sininho */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={openBell}
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

          {/* Dropdown de notificações — fixed para não ser clipado */}
          {bellOpen && (
            <div
              ref={dropdownRef}
              style={{ top: bellPos.top, left: bellPos.left }}
              className="fixed w-76 bg-white border border-gray-200 rounded-2xl shadow-xl z-200 overflow-hidden"
            >
              {/* Header compacto */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                <Bell size={13} className="text-gray-500 shrink-0" />
                <span className="text-sm font-semibold text-gray-900 flex-1">Notificações</span>
                {unread > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {unread}
                  </span>
                )}
                {unread > 0 && (
                  <button
                    onClick={handleMarcarTodas}
                    title="Marcar todas como lidas"
                    className="p-1 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border-none bg-transparent transition-colors shrink-0"
                  >
                    <CheckCheck size={15} />
                  </button>
                )}
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Bell size={24} className="text-gray-200" />
                    <p className="text-xs text-gray-400">Tudo lido!</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2.5 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50 ${!n.lida ? "bg-indigo-50/30" : ""}`}
                    >
                      <div className="shrink-0 mt-1.5">
                        {n.lida
                          ? <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                          : <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
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

                      {/* Apenas check — marca como lida e some */}
                      <button
                        onClick={() => handleMarcarLida(n.id)}
                        title="Marcar como lida"
                        className="p-1 rounded-lg text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border-none bg-transparent transition-colors shrink-0"
                      >
                        <CheckCheck size={13} />
                      </button>
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

      {/* User block + gear */}
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

          {/* Engrenagem */}
          <div ref={gearRef} className="relative shrink-0">
            <button
              onClick={() => setGearOpen((v) => !v)}
              title="Configurações"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer border-none bg-transparent transition-colors"
            >
              <Settings size={16} />
            </button>

            {gearOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-200 overflow-hidden py-1">
                <button
                  onClick={() => { setGearOpen(false); alert("Em desenvolvimento"); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer border-none bg-transparent text-left transition-colors"
                >
                  <User size={15} className="text-gray-400" />
                  Alterar dados pessoais
                </button>
                <button
                  onClick={() => { setGearOpen(false); alert("Modo escuro em desenvolvimento"); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer border-none bg-transparent text-left transition-colors"
                >
                  <Moon size={15} className="text-gray-400" />
                  Modo escuro
                  <span className="ml-auto text-[10px] text-gray-300 border border-gray-200 px-1.5 py-0.5 rounded-full">em breve</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={sair}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 cursor-pointer border-none bg-transparent text-left transition-colors"
                >
                  <LogOut size={15} className="text-rose-500" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-200 shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer border-none bg-transparent">
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 h-16 px-4 md:px-8 border-b border-gray-200 bg-white shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer border-none bg-transparent">
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
