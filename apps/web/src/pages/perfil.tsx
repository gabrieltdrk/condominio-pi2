import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../features/layout/components/app-layout";
import { getUser, updateUser } from "../features/auth/services/auth";

export default function Perfil() {
  const nav = useNavigate();
  const user = useMemo(() => getUser(), []);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [carPlate, setCarPlate] = useState(user?.carPlate ?? "");
  const [petsCount, setPetsCount] = useState(user?.petsCount?.toString() ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true });
    }
  }, [nav, user]);

  function handleSubmit() {
    updateUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      carPlate: carPlate.trim(),
      petsCount: petsCount.trim() ? Number(petsCount) : undefined,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
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
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Placa do carro</span>
              <input
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                placeholder="ABC-1234"
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
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
