import { useEffect, useMemo, useState } from "react";
import { X, Mail, Phone, Home, UserRound, Car, Heart } from "lucide-react";
import { getUser } from "../../auth/services/auth";
import { fetchUsers } from "../services/predio";
import type { Apartment } from "../services/predio";

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-1 flex items-center gap-2 text-gray-500">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function MoradorModal({
  apartment,
  onClose,
  onAssign,
}: {
  apartment: Apartment | null;
  onClose: () => void;
  onAssign?: (apartmentId: string, userId: string | null) => Promise<void>;
}) {
  const user = useMemo(() => getUser(), []);
  const isAdmin = user?.role === "ADMIN";
  const resident = apartment?.resident ?? null;
  const apartmentId = apartment?.id ?? null;

  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(resident?.id ?? null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedUserId(resident?.id ?? null);
  }, [resident]);

  useEffect(() => {
    if (!isAdmin) return;

    setLoadingUsers(true);
    fetchUsers()
      .then((data) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [isAdmin]);

  async function handleSave() {
    if (!onAssign || !apartmentId) return;
    setSaving(true);
    setError(null);
    try {
      await onAssign(apartmentId, selectedUserId);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar.");
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
        className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Unidade selecionada
            </div>
            <h3 className="mt-3 text-xl font-semibold text-gray-900">
              Apartamento {apartment.number}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Andar {apartment.floor}</p>
          </div>

          <button
            className="rounded-xl bg-transparent p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {isAdmin && (
          <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-700">Vincular morador ao apartamento</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedUserId ?? ""}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                disabled={loadingUsers || users.length === 0}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">
                  {loadingUsers ? "Carregando usuarios..." : users.length === 0 ? "Nenhum usuario disponivel" : "Nenhum (desvincular)"}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loadingUsers || users.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>

            {!loadingUsers && users.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Nenhum usuario encontrado para vincular. Crie ou recarregue os usuarios primeiro.
              </p>
            )}
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          </div>
        )}

        {resident ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <UserRound size={22} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{resident.name}</p>
                  <p className="text-sm text-gray-500">{resident.status}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoItem
                label="E-mail"
                value={resident.email}
                icon={<Mail size={14} />}
              />
              <InfoItem
                label="Telefone"
                value={resident.phone}
                icon={<Phone size={14} />}
              />
              {resident.carPlate ? (
                <InfoItem
                  label="Placa do carro"
                  value={resident.carPlate}
                  icon={<Car size={14} />}
                />
              ) : null}
              {typeof resident.petsCount === "number" ? (
                <InfoItem
                  label="Número de pets"
                  value={String(resident.petsCount)}
                  icon={<Heart size={14} />}
                />
              ) : null}
              <InfoItem
                label="Apartamento"
                value={apartment.number}
                icon={<Home size={14} />}
              />
              <InfoItem
                label="Status"
                value={resident.status}
                icon={<UserRound size={14} />}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <p className="text-base font-semibold text-gray-900">Apartamento vazio</p>
            <p className="mt-2 text-sm text-gray-500">
              Nenhum morador cadastrado para esta unidade.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
