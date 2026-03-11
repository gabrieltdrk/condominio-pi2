import { X } from "lucide-react";
import type { Apartment } from "../services/predio";

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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Apartamento {apartment.number}</h3>
            <p className="text-xs text-gray-500">Andar {apartment.floor}</p>
          </div>
          <button
            className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          {resident ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Nome</p>
                <p className="text-sm font-semibold text-gray-900">{resident.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">E-mail</p>
                <p className="text-sm font-semibold text-gray-900">{resident.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Telefone</p>
                <p className="text-sm font-semibold text-gray-900">{resident.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-semibold text-gray-900">{resident.status}</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">Apartamento vazio</p>
              <p className="mt-2 text-xs text-gray-500">Nenhum morador cadastrado para esta unidade.</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
