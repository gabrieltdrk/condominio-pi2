import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CondominioBrief } from "../../../features/dashboard/services/users";
import { RESIDENT_TYPE_LABEL } from "../../../features/dashboard/utils/user-form";
import type { FilterDraft, Role, ResidentType, SortKey } from "../types";

export type { FilterDraft };

type Props = {
  open: boolean;
  onClose: () => void;
  initial: FilterDraft;
  onApply: (f: FilterDraft) => void;
  condominios: CondominioBrief[];
  isMasterAdmin: boolean;
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "created_at", label: "Data de cadastro" },
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "role", label: "Perfil" },
];

export function FilterPanel({ open, onClose, initial, onApply, condominios, isMasterAdmin }: Props) {
  const [draft, setDraft] = useState<FilterDraft>(initial);

  useEffect(() => { if (open) setDraft(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function apply() { onApply(draft); onClose(); }
  function clear() {
    setDraft({ roles: [], tipos: [], habilitado: "", condominioId: "", sortKey: "created_at", sortDir: "desc" });
  }

  function toggleRole(r: Role) {
    setDraft((d) => ({ ...d, roles: d.roles.includes(r) ? d.roles.filter((x) => x !== r) : [...d.roles, r] }));
  }
  function toggleTipo(t: ResidentType) {
    setDraft((d) => ({ ...d, tipos: d.tipos.includes(t) ? d.tipos.filter((x) => x !== t) : [...d.tipos, t] }));
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtros e Ordenação</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isMasterAdmin && condominios.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Condomínio</p>
              <select
                value={draft.condominioId}
                onChange={(e) => setDraft((d) => ({ ...d, condominioId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white"
              >
                <option value="">Todos os condomínios</option>
                {condominios.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Perfil</p>
            <div className="space-y-1.5">
              {(["ADMIN", "MORADOR", "PORTEIRO"] as Role[]).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={draft.roles.includes(r)} onChange={() => toggleRole(r)} className="accent-indigo-600 w-4 h-4" />
                  <span className="text-sm text-gray-700">{r === "ADMIN" ? "Administrador" : r === "PORTEIRO" ? "Porteiro" : "Morador"}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
            <div className="space-y-1.5">
              {(["PROPRIETARIO", "INQUILINO", "VISITANTE"] as ResidentType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={draft.tipos.includes(t)} onChange={() => toggleTipo(t)} className="accent-indigo-600 w-4 h-4" />
                  <span className="text-sm text-gray-700">{RESIDENT_TYPE_LABEL[t]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Habilitado</p>
            <div className="space-y-1.5">
              {([["", "Todos"], ["sim", "Habilitado"], ["nao", "Desabilitado"]] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="habilitado" checked={draft.habilitado === val} onChange={() => setDraft((d) => ({ ...d, habilitado: val }))} className="accent-indigo-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ordenar por</p>
            <select
              value={draft.sortKey}
              onChange={(e) => setDraft((d) => ({ ...d, sortKey: e.target.value as SortKey }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white"
            >
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              {(["desc", "asc"] as const).map((dir) => (
                <button key={dir} onClick={() => setDraft((d) => ({ ...d, sortDir: dir }))}
                  className={`flex-1 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors ${draft.sortDir === dir ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  {dir === "desc" ? "Decrescente" : "Crescente"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={clear} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Limpar</button>
          <button onClick={apply} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer transition-colors">Aplicar</button>
        </div>
      </div>
    </>
  );
}
