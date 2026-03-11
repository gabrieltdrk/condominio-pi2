import { X, Mail, Phone, Home, UserRound } from "lucide-react";
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
}: {
  apartment: Apartment | null;
  onClose: () => void;
}) {
  if (!apartment) return null;

  const resident = apartment.resident;

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