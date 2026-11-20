import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UserRound, X } from "lucide-react";
import { getUser } from "../../auth/services/auth";
import {
  addApartmentResident,
  fetchBuilding,
  fetchUsers,
  removeApartmentResident,
} from "../services/predio";
import type { Apartment, Resident } from "../services/predio";

type UserOption = { id: string; name: string; email: string };

const STATUS_ORDER: Record<string, number> = { Proprietário: 0, Inquilino: 1, Visitante: 2, Vago: 3 };

function sortedResidents(residents: Resident[]): Resident[] {
  return [...residents].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
}

export function MoradorModal({
  apartment,
  onClose,
  onReload,
  onDeleteApartment,
}: {
  apartment: Apartment | null;
  onClose: () => void;
  onReload?: () => Promise<void>;
  onDeleteApartment?: (apartment: Apartment) => Promise<void>;
}) {
  const currentUser = useMemo(() => getUser(), []);
  const isAdmin = currentUser?.role === "ADMIN";

  const residents = useMemo(
    () => sortedResidents(apartment?.residents ?? (apartment?.resident ? [apartment.resident] : [])),
    [apartment],
  );
  const activeVisitors = apartment?.activeVisitors ?? [];
  const apartmentId = apartment?.id ?? null;

  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [showNewSlot, setShowNewSlot] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowNewSlot(false);
    setNewUserId("");
    setError(null);
  }, [apartment?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    Promise.all([fetchUsers(), fetchBuilding()])
      .then(([users, building]) => {
        setAllUsers(users);
        const occupied = new Set<string>();
        for (const floor of building) {
          for (const apt of floor.apartments) {
            for (const r of apt.residents) {
              if (r.id) occupied.add(r.id);
            }
          }
        }
        setAssignedUserIds(occupied);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [isAdmin, apartment?.id]);

  // Users free to assign: not assigned anywhere, OR already in this apartment
  const currentResidentIds = useMemo(
    () => new Set(residents.map((r) => r.id).filter(Boolean) as string[]),
    [residents],
  );

  const availableUsers = useMemo(
    () => allUsers.filter((u) => !assignedUserIds.has(u.id) || currentResidentIds.has(u.id)),
    [allUsers, assignedUserIds, currentResidentIds],
  );

  // exclude already-linked residents from the new-slot options
  const newSlotOptions = useMemo(
    () => availableUsers.filter((u) => !currentResidentIds.has(u.id)),
    [availableUsers, currentResidentIds],
  );

  async function handleAdd() {
    if (!apartmentId || !newUserId) return;
    setSaving(true);
    setError(null);
    try {
      await addApartmentResident(apartmentId, newUserId);
      setShowNewSlot(false);
      setNewUserId("");
      await onReload?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao vincular morador.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(residentId: string | undefined) {
    if (!apartmentId || !residentId) return;
    setSaving(true);
    setError(null);
    try {
      await removeApartmentResident(apartmentId, residentId);
      await onReload?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao desvincular morador.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteApartment() {
    if (!apartment || !onDeleteApartment) return;
    if (residents.length > 0) {
      setError("Desvincule todos os moradores antes de excluir o apartamento.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onDeleteApartment(apartment);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir apartamento.");
    } finally {
      setSaving(false);
    }
  }

  if (!apartment) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Unidade selecionada
            </span>
            <h3 className="mt-2 text-xl font-semibold text-gray-900">Apartamento {apartment.number}</h3>
            <p className="mt-0.5 text-sm text-gray-500">Andar {apartment.floor}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isAdmin && (
              <button
                type="button"
                title="Vincular morador"
                onClick={() => { setShowNewSlot(true); setNewUserId(""); }}
                disabled={loadingUsers || showNewSlot}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40"
              >
                <Plus size={18} />
              </button>
            )}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-transparent text-gray-400 transition hover:bg-gray-100"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* New slot */}
          {showNewSlot && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-2">Selecionar morador</p>
              <div className="flex items-center gap-2">
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  disabled={loadingUsers}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">
                    {loadingUsers ? "Carregando..." : newSlotOptions.length === 0 ? "Nenhum usuário disponível" : "Selecionar..."}
                  </option>
                  {newSlotOptions.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={saving || !newUserId}
                  className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewSlot(false); setNewUserId(""); }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:text-rose-500"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Residents table */}
          {residents.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Morador</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Telefone</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                    {isAdmin && <th className="px-4 py-2.5 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {residents.map((r, idx) => (
                    <tr key={r.id ?? idx} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <UserRound size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{r.name}</p>
                            <p className="truncate text-xs text-slate-400">{r.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{r.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          r.status === "Proprietário"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : r.status === "Inquilino"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleRemove(r.id)}
                            disabled={saving}
                            title="Desvincular"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-gray-700">Apartamento vazio</p>
              <p className="mt-1 text-xs text-gray-400">Nenhum morador vinculado a esta unidade.</p>
            </div>
          )}

          {/* Visitors */}
          {activeVisitors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Visitantes em check-in</p>
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{visitor.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{visitor.email || "E-mail não informado"}</p>
                    </div>
                    <div className="text-xs text-slate-500 sm:text-right space-y-0.5">
                      <p>Check-in: {visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleString("pt-BR") : "Agora"}</p>
                      <p>Até: {new Date(visitor.expectedCheckOut).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 rounded-b-3xl">
          {isAdmin && onDeleteApartment && (
            <button
              type="button"
              onClick={() => void handleDeleteApartment()}
              disabled={saving || residents.length > 0}
              title={residents.length > 0 ? "Desvincule os moradores antes de excluir" : "Excluir apartamento"}
              className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Excluindo..." : "Excluir apartamento"}
            </button>
          )}
          <button
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
