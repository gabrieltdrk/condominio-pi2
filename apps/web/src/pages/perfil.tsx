import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Camera, CarFront, Mail, PawPrint, Phone, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import { removeOwnProfileAvatar, saveOwnProfile, uploadOwnProfileAvatar } from "../features/auth/services/profile";
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

const inputClass =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

export default function Perfil() {
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState(() => getUser());

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [carPlate, setCarPlate] = useState(user?.carPlate ?? "");
  const [petsCount, setPetsCount] = useState(user?.petsCount?.toString() ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const initials = useMemo(() => {
    if (!name.trim()) return "U";

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [name]);

  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true });
    }
  }, [nav, user]);

  function showSuccess() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

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
      const nextUser = await saveOwnProfile({
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        carPlate: normalizedCarPlate,
        petsCount: petsCount.trim() ? Number(petsCount) : 0,
      });

      setUser(nextUser);
      setAvatarUrl(nextUser.avatarUrl ?? "");
      setCarPlate(formatCarPlate(normalizedCarPlate));
      showSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar seus dados.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setAvatarBusy(true);

    try {
      const nextUser = await uploadOwnProfileAvatar(file);
      setUser(nextUser);
      setAvatarUrl(nextUser.avatarUrl ?? "");
      showSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar a foto.");
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setError("");
    setAvatarBusy(true);

    try {
      const nextUser = await removeOwnProfileAvatar();
      setUser(nextUser);
      setAvatarUrl("");
      showSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover a foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title="Meu perfil">
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))]">
          <div className="rounded-[30px] border border-slate-900/5 bg-slate-950 p-6 text-white shadow-[0_32px_80px_-38px_rgba(15,23,42,0.8)]">
            <div className="flex items-start gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name || user.name} className="h-16 w-16 rounded-[24px] object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/10 text-xl font-black tracking-[-0.04em]">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{name || user.name}</p>
                <p className="mt-1 truncate text-sm text-slate-300">{email || "Email nao informado"}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                  <ShieldCheck size={12} />
                  {user.role === "ADMIN" ? "Administrador" : user.role === "PORTEIRO" ? "Portaria" : "Morador"}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Camera size={14} />
                    {avatarBusy ? "Enviando..." : avatarUrl ? "Trocar foto" : "Adicionar foto"}
                  </button>

                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={avatarBusy}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      Remover
                    </button>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <Phone size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Telefone</span>
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900">{phone || "Nao informado"}</p>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <CarFront size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Placa</span>
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900">{carPlate || "Nao informada"}</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              <div className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Dados principais</p>
                    <p className="text-xs text-slate-500">Nome e email do cadastro.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Nome completo</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Email</span>
                    <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                  </label>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Contato</p>
                    <p className="text-xs text-slate-500">Informacoes para avisos e comunicacao.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Telefone</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(formatPhone(event.target.value))}
                      placeholder="(11) 99999-0000"
                      pattern={PHONE_PATTERN}
                      title={PHONE_INPUT_TITLE}
                      inputMode="tel"
                      maxLength={15}
                      className={inputClass}
                    />
                  </label>

                  <div className="rounded-[24px] border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">Canal principal</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Mantenha telefone e email atualizados para receber avisos e facilitar o contato da administracao.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <CarFront size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Veiculo e pets</p>
                    <p className="text-xs text-slate-500">Dados complementares do morador.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Placa do carro</span>
                    <input
                      value={carPlate}
                      onChange={(event) => setCarPlate(formatCarPlate(event.target.value))}
                      placeholder="ABC-1234"
                      pattern={CAR_PLATE_PATTERN}
                      title={CAR_PLATE_INPUT_TITLE}
                      maxLength={8}
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Numero de pets</span>
                    <input
                      type="number"
                      min={0}
                      value={petsCount}
                      onChange={(event) => setPetsCount(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-6">
                {saved ? <span className="text-sm font-medium text-emerald-700">Dados atualizados com sucesso.</span> : null}
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
              <h3 className="m-0 text-base font-semibold text-slate-900">Lembretes</h3>
              <div className="mt-4 space-y-3">
                {[
                  "A foto de perfil ajuda a identificar rapidamente o usuario no sistema.",
                  "Use imagens JPG, PNG ou WEBP com ate 5 MB.",
                  "Mantenha telefone e placa atualizados para facilitar atendimento e acesso.",
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
