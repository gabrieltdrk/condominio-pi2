import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logout, getUser } from "../services/auth";

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

  function sair() {
    logout();
    nav("/login");
  }

  const navLinks = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Ocorrências", path: "/ocorrencias" },
  ];

  return (
    <div className="p-6">
      <div className="w-full max-w-225 mx-auto bg-white rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-8 border border-gray-200">
        <div className="flex justify-between gap-3 items-center">
          <div>
            <h1 className="m-0">{title}</h1>
            <p className="mt-1.5 text-gray-500 text-sm">
              Logado como: <b>{user?.name}</b> ({user?.role})
            </p>
          </div>

          <button
            className="bg-gray-900 text-white font-medium cursor-pointer px-4 py-3 rounded-[10px] border-none"
            onClick={sair}
          >
            Sair
          </button>
        </div>

        <nav className="flex gap-1 mt-4 border-b border-gray-200 pb-0">
          {navLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => nav(link.path)}
                className={`px-3 py-2 text-sm font-semibold cursor-pointer border-none bg-transparent rounded-t-lg transition-colors
                  ${active
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
                style={{ marginBottom: active ? -1 : 0 }}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}