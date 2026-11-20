import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  CalendarDays,
  CarFront,
  CheckCheck,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  ClipboardList,
  Home,
  Landmark,
  LogOut,
  Megaphone,
  Menu,
  MessageCircleMore,
  MessageSquare,
  Moon,
  Package,
  Plus,
  Settings,
  Sun,
  User,
  UserRoundCheck,
  Users,
  BarChart2,
  FileText,
  Truck,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { logout, getUser, updateUser } from "../../auth/services/auth";
import { hasFeature, type PlanId } from "../../../config/plans";
import { supabase } from "../../../lib/supabase";
import { refreshStoredUser } from "../../auth/services/profile";
import { AVISO_TIPO_COLORS, type AvisoTipo } from "../../avisos/services/avisos";
import { useDarkMode } from "../hooks/use-dark-mode";
import { useNotifications } from "../hooks/use-notifications";

const SIDEBAR_STORAGE_KEY = "omni:sidebar-collapsed";

type NavLink = { label: string; path: string; icon: React.ElementType };
type NavSubmenu = { label: string; icon: React.ElementType; children: NavLink[] };
type NavItem = NavLink | NavSubmenu;
type NavGroup = { title: string; links: NavItem[] };

function isSubmenu(item: NavItem): item is NavSubmenu {
  return "children" in item;
}

const GROUP_COLORS: Record<string, string> = {
  "Comunicação":  "bg-sky-50    text-sky-500",
  "Comunidade":   "bg-violet-50 text-violet-500",
  "Áreas Comuns": "bg-emerald-50 text-emerald-600",
  "Operações":    "bg-orange-50 text-orange-500",
  "Gestão":       "bg-indigo-50 text-indigo-600",
  "Financeiro":   "bg-teal-50   text-teal-600",
  "Admin":        "bg-rose-50   text-rose-500",
};

function buildGroups(role: string | undefined, plan: PlanId): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: "",
      links: [{ label: "Dashboard", path: "/dashboard", icon: Home }],
    },
    {
      title: "Comunicação",
      links: [
        { label: "Avisos", path: "/avisos", icon: Megaphone },
        { label: "Assembleia", path: "/enquetes", icon: MessageSquare },
      ],
    },
    {
      title: "Comunidade",
      links: [
        { label: "Visitantes", path: "/visitantes", icon: UserRoundCheck },
        { label: "Encomendas", path: "/encomendas", icon: Package },
        ...(role === "MORADOR" ? [{ label: "Moradores", path: "/usuarios", icon: Users }] : []),
      ],
    },
    {
      title: "Áreas Comuns",
      links: [
        {
          label: "Agendamentos",
          icon: CalendarDays,
          children: [
            { label: "Ver agendamentos", path: "/agendamentos", icon: CalendarDays },
            { label: "Criar agendamento", path: "/agendamentos/novo", icon: Plus },
          ],
        },
        { label: "Garagem", path: "/garagem", icon: CarFront },
      ],
    },
  ];

  const operacoesLinks: NavLink[] = [];
  if (hasFeature(plan, "ocorrencias")) {
    operacoesLinks.push({ label: "Ocorrências", path: "/ocorrencias", icon: ClipboardList });
  }
  operacoesLinks.push({ label: "Manutenção", path: "/manutencao", icon: Waves });
  groups.push({ title: "Operações", links: operacoesLinks });

  if (role === "ADMIN" || role === "MASTER_ADMIN") {
    const gestaoLinks: NavItem[] = [
      {
        label: "Edifício",
        icon: Building2,
        children: [
          { label: "Mapa do edifício", path: "/predio", icon: Building2 },
          ...(role === "ADMIN" ? [{ label: "Documentos", path: "/predio/documentos", icon: FileText }] : []),
        ],
      },
      { label: "Moradores", path: "/usuarios", icon: Users },
      ...(role === "ADMIN" ? [{ label: "Áreas Comuns", path: "/areas-comuns", icon: CalendarDays }] : []),
    ];
    if (hasFeature(plan, "relatoriosFinanceiros")) {
      gestaoLinks.push({ label: "Relatórios", path: "/relatorios", icon: BarChart2 });
    }
    groups.push({ title: "Gestão", links: gestaoLinks });

    if (hasFeature(plan, "financeiro")) {
      const finLinks: NavLink[] = [
        { label: "Geral", path: "/financeiro", icon: CircleDollarSign },
        { label: "Contas", path: "/financeiro/contas", icon: Wallet },
        { label: "Fornecedores", path: "/financeiro/fornecedores", icon: Truck },
        { label: "Balancete", path: "/financeiro/balancete", icon: FileText },
      ];
      groups.push({ title: "Financeiro", links: finLinks });
    }
  }

  if (role === "MASTER_ADMIN") {
    groups.push({
      title: "Admin",
      links: [
        { label: "Condomínios", path: "/condominios", icon: Landmark },
        { label: "Planos", path: "/planos", icon: BarChart2 },
      ],
    });
  }

  return groups;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitialCollapsedState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

type SidebarProps = {
  mobile: boolean;
  collapsed: boolean;
  condName: string | null;
  condPlan: PlanId;
  groups: NavGroup[];
  openSubmenus: Record<string, boolean>;
  setOpenSubmenus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  user: ReturnType<typeof getUser>;
  initials: string;
  dark: boolean;
  gearOpen: boolean;
  setGearOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDark: () => void;
  sair: () => void;
  nav: ReturnType<typeof useNavigate>;
  location: ReturnType<typeof useLocation>;
  onCollapse: () => void;
  onCloseMobile: () => void;
};

function SidebarContent({
  mobile, collapsed: collapsedProp, condName, condPlan, groups, openSubmenus,
  setOpenSubmenus, user, initials, dark, gearOpen, setGearOpen, toggleDark,
  sair, nav, location, onCollapse, onCloseMobile,
}: SidebarProps) {
  const collapsed = mobile ? false : collapsedProp;
  const navRef = useRef<HTMLElement>(null);
  const scrollPos = useRef(0);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.scrollTop = scrollPos.current;
    function save() { scrollPos.current = el!.scrollTop; }
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  });

  return (
    <>
      <div className={`shrink-0 border-b border-gray-100 ${collapsed ? "flex flex-col items-center gap-2 px-2 py-3" : "flex h-16 items-center gap-2 px-4"}`}>
        <div className={`shrink-0 overflow-hidden ${collapsed ? "h-11 w-11 rounded-2xl" : "h-8 w-8 rounded-xl"}`}>
          <img src="/Logo.png" alt="Logo" className="h-full w-full object-contain" />
        </div>
        {!collapsed && <span className="flex-1 text-sm font-bold leading-none text-gray-900">OmniLar</span>}
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-1"}`}>
          {!mobile && (
            <button onClick={onCollapse}
              className="rounded-lg bg-transparent p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title={collapsed ? "Expandir menu" : "Recolher menu"}>
              {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
            </button>
          )}
          {mobile && (
            <button onClick={onCloseMobile}
              className="rounded-lg bg-transparent p-1.5 text-gray-400 transition-colors hover:bg-gray-100">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {condName && !collapsed && (
        <div className="shrink-0 border-b border-gray-100 px-4 py-2.5 text-center">
          <p className="wrap-break-word text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600 leading-snug">{condName}</p>
          {condPlan && (
            <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">
              {condPlan}
            </span>
          )}
        </div>
      )}

      <nav ref={navRef} className={`min-h-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden ${collapsed ? "gap-2 p-2" : "gap-0.5 p-3"}`}>
        {groups.map((group) => (
          <div key={group.title} className={collapsed ? "space-y-2" : "space-y-1"}>
            {!collapsed && group.title && (
              <p className={`mx-1 mt-3 mb-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${GROUP_COLORS[group.title] ?? "bg-gray-100 text-gray-400"}`}>
                {group.title}
              </p>
            )}
            {group.links.map((item) => {
              if (isSubmenu(item)) {
                const ParentIcon = item.icon;
                const isOpen = openSubmenus[item.label] ?? false;
                const hasActiveChild = item.children.some((c) => location.pathname === c.path);
                if (collapsed) {
                  return (
                    <button key={item.label} title={item.label}
                      className={`w-full flex h-11 items-center justify-center px-0 rounded-xl border-none text-sm font-medium transition-colors ${hasActiveChild ? "bg-indigo-50 text-indigo-700" : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}>
                      <ParentIcon size={17} className={hasActiveChild ? "text-indigo-600" : "text-gray-400"} />
                    </button>
                  );
                }
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => setOpenSubmenus((prev) => ({ ...prev, [item.label]: !isOpen }))}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl border-none text-sm font-medium transition-colors ${hasActiveChild ? "bg-indigo-50 text-indigo-700" : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}>
                      <ParentIcon size={17} className={hasActiveChild ? "text-indigo-600" : "text-gray-400"} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen || hasActiveChild ? "rotate-180" : ""}`} />
                    </button>
                    {(isOpen || hasActiveChild) && (
                      <div className="ml-4 mt-0.5 space-y-0.5">
                        {item.children.map((child) => {
                          const childActive = location.pathname === child.path;
                          const ChildIcon = child.icon;
                          return (
                            <button key={child.path}
                              onClick={() => { nav(child.path); onCloseMobile(); }}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl border-none text-sm font-medium transition-colors ${childActive ? "bg-indigo-50 text-indigo-700" : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}>
                              <ChildIcon size={15} className={childActive ? "text-indigo-600" : "text-gray-400"} />
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const { label, path, icon: Icon } = item;
              const active = location.pathname === path;
              return (
                <button key={path}
                  onClick={() => { nav(path); onCloseMobile(); }}
                  title={collapsed ? label : undefined}
                  className={`w-full rounded-xl border-none text-sm font-medium transition-colors ${
                    collapsed
                      ? `flex h-11 items-center justify-center px-0 ${active ? "bg-indigo-50 text-indigo-700" : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`
                      : `flex items-center gap-3 px-3 py-2.5 text-left ${active ? "bg-indigo-50 text-indigo-700" : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`
                  }`}>
                  <Icon size={17} className={active ? "text-indigo-600" : "text-gray-400"} />
                  {!collapsed && label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-gray-100 p-3">
        <div className={`flex px-2 py-2 ${collapsed ? "flex-col items-center gap-2" : "items-center gap-2.5"}`}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
            : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100"><span className="text-xs font-bold text-indigo-700">{initials}</span></div>
          }
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight text-gray-900">{user?.name ?? "Usuario"}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-gray-400">
                {user?.role === "MASTER_ADMIN" ? "Master Admin" : user?.role === "ADMIN" ? "Administrador" : user?.role === "PORTEIRO" ? "Portaria" : "Morador"}
              </p>
            </div>
          )}
          <div className="relative shrink-0">
            <button onClick={() => setGearOpen((v) => !v)} title="Configuracoes"
              className="rounded-lg bg-transparent p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
              <Settings size={16} />
            </button>
            {gearOpen && (
              <>
                <div className="fixed inset-0 z-199" onClick={() => setGearOpen(false)} />
                <div className={`absolute z-200 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl ${collapsed ? "bottom-0 left-full ml-2 w-52" : "bottom-full right-0 mb-2 w-52"}`}>
                  <button onClick={() => { setGearOpen(false); nav("/perfil"); }}
                    className="flex w-full items-center gap-2.5 bg-transparent px-3 py-2.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100">
                    <User size={15} className="text-gray-400" /> Alterar dados pessoais
                  </button>
                  <button onClick={() => { toggleDark(); setGearOpen(false); }}
                    className="flex w-full items-center gap-2.5 bg-transparent px-3 py-2.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100">
                    {dark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-gray-400" />}
                    {dark ? "Modo claro" : "Modo escuro"}
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={sair}
                    className="flex w-full items-center gap-2.5 bg-transparent px-3 py-2.5 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50">
                    <LogOut size={15} className="text-rose-500" /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const nav = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getUser());
  const [condPlan, setCondPlan] = useState<PlanId>(null);
  const [condName, setCondName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsedState);
  const { notifs, bellOpen, setBellOpen, bellPos, bellRef, unread, openBell, handleMarcarLida, handleMarcarTodas } = useNotifications();
  const { dark, toggleDark } = useDarkMode();
  const [gearOpen, setGearOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const u = getUser();
    if (u?.condominioUUID) {
      supabase.from("condominios").select("plan, name").eq("id", u.condominioUUID).single()
        .then(({ data }) => {
          const plan = (data?.plan ?? null) as PlanId;
          setCondPlan(plan);
          setCondName((data?.name ?? null) as string | null);
          updateUser({ plan });
        });
    }
  }, [user?.condominioUUID]);

  useEffect(() => {
    let active = true;

    async function syncUser() {
      const refreshed = await refreshStoredUser();
      if (!active || !refreshed) return;
      setUser(refreshed);
    }

    void syncUser();
    const handleFocus = () => void syncUser();
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  function sair() {
    void logout();
    nav("/login");
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "U";

  const role = user?.role;
  const groups = buildGroups(role, condPlan);

  const sidebarProps = {
    collapsed: sidebarCollapsed,
    condName,
    condPlan,
    groups,
    openSubmenus,
    setOpenSubmenus,
    user,
    initials,
    dark,
    gearOpen,
    setGearOpen,
    toggleDark,
    sair,
    nav,
    location,
    onCollapse: () => setSidebarCollapsed((v) => !v),
    onCloseMobile: () => setSidebarOpen(false),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside
        className={`hidden shrink-0 overflow-visible border-r border-gray-200 bg-white transition-[width] duration-300 md:flex md:flex-col ${
          sidebarCollapsed ? "w-20" : "w-60"
        }`}
      >
        <SidebarContent {...sidebarProps} mobile={false} />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-visible border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent {...sidebarProps} mobile={true} />
      </aside>

      {bellOpen && (
        <>
          <div className="fixed inset-0 z-199" onClick={() => setBellOpen(false)} />
          <div
            style={{ top: bellPos.top, left: bellPos.left }}
            className="fixed z-200 w-76 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
              <Bell size={13} className="shrink-0 text-gray-500" />
              <span className="flex-1 text-sm font-semibold text-gray-900">Notificacoes</span>
              {unread > 0 && (
                <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  {unread}
                </span>
              )}
              {unread > 0 && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleMarcarTodas();
                  }}
                  title="Marcar todas como lidas"
                  className="shrink-0 rounded-lg bg-transparent p-1 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <CheckCheck size={15} />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <Bell size={24} className="text-gray-200" />
                  <p className="text-xs text-gray-400">Tudo lido!</p>
                </div>
              ) : (
                notifs.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-2.5 border-b border-gray-50 px-4 py-3 transition-colors last:border-0 hover:bg-gray-50 ${
                      !notification.lida ? "bg-indigo-50/30" : ""
                    }`}
                  >
                    <div className="mt-1.5 shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </div>

                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        handleMarcarLida(notification.id);
                        setBellOpen(false);
                        nav(notification.link ?? "/avisos");
                      }}
                    >
                      {notification.aviso_tipo && (
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${AVISO_TIPO_COLORS[notification.aviso_tipo as AvisoTipo] ?? "border-gray-200 bg-gray-100 text-gray-500"}`}>
                          {notification.aviso_tipo}
                        </span>
                      )}
                      {!notification.aviso_tipo && notification.categoria && (
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                          {notification.categoria}
                        </span>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-tight text-gray-800">
                        {notification.titulo ?? notification.aviso_titulo ?? "Nova notificacao"}
                      </p>
                      {notification.mensagem && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{notification.mensagem}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(notification.created_at)}</p>
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMarcarLida(notification.id);
                      }}
                      title="Marcar como lida"
                      className="shrink-0 rounded-lg bg-transparent p-1 text-gray-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <CheckCheck size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg bg-transparent p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden"
            title="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <h1 className="m-0 flex-1 truncate text-base font-semibold text-gray-800">{title}</h1>

          <button
            ref={bellRef}
            onClick={openBell}
            className="relative rounded-lg bg-transparent p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title="Notificacoes"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 xl:px-8">{children}</main>
      </div>

      {user?.role !== "PORTEIRO" && (
        <button
          type="button"
          onClick={() => nav("/chat")}
          title="Abrir chat"
          className={`fixed bottom-5 right-5 z-30 inline-flex h-14 items-center justify-center gap-2 rounded-full border px-4 shadow-[0_20px_45px_-18px_rgba(14,165,233,0.45)] transition ${
            location.pathname === "/chat"
              ? "border-sky-300 bg-sky-600 text-white"
              : "border-sky-200 bg-white text-sky-700 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
          }`}
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${location.pathname === "/chat" ? "bg-white/15" : "bg-sky-100"}`}>
            <MessageCircleMore size={22} />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">Chat</span>
        </button>
      )}
    </div>
  );
}
