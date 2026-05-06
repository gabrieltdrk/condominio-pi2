import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, LogOut } from "lucide-react";
import {
  getSelectionToken,
  selectCondominio,
  logout,
  type CondominioOption,
} from "../features/auth/services/auth";

export default function SelectCondominium() {
  const nav = useNavigate();
  const [condominios, setCondominios] = useState<CondominioOption[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState<number | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("selectionData");
    if (!raw || !getSelectionToken()) {
      nav("/login", { replace: true });
      return;
    }
    const { condominios: list, userName: name } = JSON.parse(raw) as {
      condominios: CondominioOption[];
      userName: string;
    };
    setCondominios(list);
    setUserName(name);
  }, [nav]);

  async function handleSelect(option: CondominioOption) {
    setErr("");
    setLoading(option.id);
    try {
      await selectCondominio(option.id);
      sessionStorage.removeItem("selectionData");
      nav("/dashboard", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao selecionar condomínio.");
      setLoading(null);
    }
  }

  async function handleLogout() {
    await logout();
    nav("/login", { replace: true });
  }

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    MORADOR: "Morador",
    PORTEIRO: "Porteiro",
    MASTER_ADMIN: "Master Admin",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header card */}
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#223555] text-white shadow-lg shadow-slate-200">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Selecione o condomínio</h1>
              {userName && (
                <p className="text-sm text-slate-400">
                  Olá, <span className="font-medium text-slate-600">{userName}</span>
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Você está vinculado a múltiplos condomínios. Escolha em qual deseja entrar agora.
          </p>
        </div>

        {/* Condomínio list */}
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] overflow-hidden">
          {condominios.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              disabled={loading !== null}
              className={[
                "flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-slate-50 disabled:opacity-60",
                idx < condominios.length - 1 ? "border-b border-slate-100" : "",
              ].join(" ")}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{roleLabel[c.role] ?? c.role}</p>
              </div>
              {loading === c.id ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              ) : (
                <ChevronRight size={18} className="shrink-0 text-slate-300" />
              )}
            </button>
          ))}
        </div>

        {err && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{err}</p>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 transition hover:bg-slate-50"
        >
          <LogOut size={16} />
          Sair e usar outra conta
        </button>
      </div>
    </div>
  );
}
