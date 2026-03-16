import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import { saveOwnProfile } from "../features/auth/services/profile";
import {
  CAR_PLATE_INPUT_TITLE,
  CAR_PLATE_PATTERN,
  PHONE_INPUT_TITLE,
  PHONE_PATTERN,
  formatCarPlate,
  formatPhone,
  isCarPlateValid,
  isPhoneValid,
  normalizeCarPlate,
} from "../features/dashboard/utils/user-form";

export default function Perfil() {
  const nav = useNavigate();
  const user = useMemo(() => getUser(), []);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [carPlate, setCarPlate] = useState(user?.carPlate ?? "");
  const [petsCount, setPetsCount] = useState(user?.petsCount?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true });
    }
  }, [nav, user]);

  async function handleSubmit() {
    const normalizedPhone = formatPhone(phone);
    if (normalizedPhone && !isPhoneValid(normalizedPhone)) {
      setError("Informe um telefone valido no formato (11) 99999-9999.");
      return;
    }

    const normalizedCarPlate = normalizeCarPlate(carPlate);
    if (!isCarPlateValid(normalizedCarPlate)) {
      setError("Informe uma placa valida no formato ABC-1234 ou ABC1D23.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await saveOwnProfile({
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        carPlate: normalizedCarPlate,
        petsCount: petsCount.trim() ? Number(petsCount) : 0,
      });
      setCarPlate(formatCarPlate(normalizedCarPlate));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar seus dados.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title="Editar perfil">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Editar perfil</h2>
              <p className="mt-1 text-sm text-slate-500">
                Atualize suas informações pessoais para que o condomínio possa entrar em contato quando necessário.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Telefone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-0000"
                pattern={PHONE_PATTERN}
                title={PHONE_INPUT_TITLE}
                inputMode="tel"
                maxLength={15}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Placa do carro</span>
              <input
                value={carPlate}
                onChange={(e) => setCarPlate(formatCarPlate(e.target.value))}
                placeholder="ABC-1234"
                pattern={CAR_PLATE_PATTERN}
                title={CAR_PLATE_INPUT_TITLE}
                maxLength={8}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Número de pets</span>
              <input
                type="number"
                min={0}
                value={petsCount}
                onChange={(e) => setPetsCount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {saved && <span className="text-sm font-medium text-emerald-700">Dados atualizados com sucesso!</span>}
              {error && <span className="text-sm font-medium text-rose-600">{error}</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => nav(-1)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
