import { useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, ClipboardList, Home, LogOut, Menu, X } from "lucide-react";
import { logout, getUser } from "../services/auth";

const navLinks = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Ocorrências", path: "/ocorrencias", icon: ClipboardList },
];

export default function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const nav = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function sair() {
    logout();
    nav("/login");
  }

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "U";

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <span className="font-bold text-sm text-gray-900 leading-none">Condomínio</span>
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
            <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
              {user?.name ?? "Usuário"}
            </p>
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

      {/* ── Sidebar desktop (md+) ── */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Sidebar mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 md:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer border-none bg-transparent"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 h-16 px-4 md:px-8 border-b border-gray-200 bg-white shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer border-none bg-transparent"
          >
            <Menu size={20} />
          </button>
          <h1 className="m-0 text-base font-semibold text-gray-800 truncate">{title}</h1>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
