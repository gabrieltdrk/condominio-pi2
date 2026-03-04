import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../services/auth";

export default function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const nav = useNavigate();
  const user = getUser();

  function sair() {
    logout();
    nav("/login");
  }

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

        <hr className="border-0 border-t border-gray-200 my-4" />

        {children}
      </div>
    </div>
  );
}