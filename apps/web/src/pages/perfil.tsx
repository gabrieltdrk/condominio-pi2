import { useEffect, useMemo, useState } from "react";
import { CarFront, Mail, PawPrint, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
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

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [user?.name]);

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
    <AppLayout title="Meu perfil">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(199,210,254,0.42),_transparent_35%),linear-gradient(135deg,_#eef2ff_0%,_#ffffff_54%,_#f8fafc_100%)] p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
                <UserRound size={13} />
                Area pessoal
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Revise suas informacoes pessoais e mantenha seu cadastro sempre atualizado para facilitar o contato com o condominio.
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-900/5 bg-slate-950 p-6 text-white shadow-[0_32px_80px_-38px_rgba(15,23,42,0.8)]">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/10 text-xl font-black tracking-[-0.04em]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                    <ShieldCheck size={12} />
                    {user.role === "ADMIN" ? "Administrador" : "Morador"}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Telefone</p>
                  <p className="mt-2 text-sm font-semibold">{phone || "Nao informado"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Placa</p>
                  <p className="mt-2 text-sm font-semibold">{carPlate || "Nao informada"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">Editar informacoes</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Revise seus dados pessoais, de contato e do veiculo em um unico lugar.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Dados principais</p>
                    <p className="text-xs text-slate-500">Informacoes basicas de identificacao.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Nome completo</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Contato e acesso</p>
                    <p className="text-xs text-slate-500">Dados usados para comunicacao com o condominio.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
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
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">Canal principal</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Sempre que possivel, mantenha telefone e email atualizados para avisos, ocorrencias e contato rapido da administracao.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <CarFront size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Veiculo e pets</p>
                    <p className="text-xs text-slate-500">Informacoes complementares da sua unidade.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Placa do carro</span>
                    <input
                      value={carPlate}
                      onChange={(e) => setCarPlate(formatCarPlate(e.target.value))}
                      placeholder="ABC-1234"
                      pattern={CAR_PLATE_PATTERN}
                      title={CAR_PLATE_INPUT_TITLE}
                      maxLength={8}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Numero de pets</span>
                    <input
                      type="number"
                      min={0}
                      value={petsCount}
                      onChange={(e) => setPetsCount(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {saved ? <span className="text-sm font-medium text-emerald-700">Dados atualizados com sucesso!</span> : null}
                {error ? <span className="text-sm font-medium text-rose-600">{error}</span> : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => nav(-1)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Salvando..." : "Salvar alteracoes"}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-base font-semibold text-slate-900">Resumo rapido</h3>
              <div className="mt-4 space-y-3">
                {[
                  { icon: Mail, label: "Email", value: email || "Nao informado" },
                  { icon: Phone, label: "Telefone", value: phone || "Nao informado" },
                  { icon: CarFront, label: "Placa", value: carPlate || "Nao informada" },
                  { icon: PawPrint, label: "Pets", value: petsCount || "0" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Icon size={15} />
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.label}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-base font-semibold text-slate-900">Dicas</h3>
              <div className="mt-4 space-y-3">
                {[
                  "Se trocar de telefone, atualize aqui para manter o contato em dia.",
                  "Use a placa no formato ABC-1234 ou ABC1D23.",
                  "Esses dados ajudam em acesso, garagem e comunicacoes da administracao.",
                ].map((tip) => (
                  <div key={tip} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {tip}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppLayout>
  );
}
