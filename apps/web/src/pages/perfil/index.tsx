import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Camera, CarFront, Mail, PawPrint, Phone, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { removeOwnProfileAvatar, saveOwnProfile, uploadOwnProfileAvatar } from "../../features/auth/services/profile";
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
} from "../../features/dashboard/utils/user-form";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-400";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  MASTER_ADMIN: "Master Admin",
  PORTEIRO: "Portaria",
  MORADOR: "Morador",
};

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
    return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }, [name]);

  useEffect(() => {
    if (!user) nav("/login", { replace: true });
  }, [nav, user]);

  function showSuccess() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  async function handleSubmit() {
    const normalizedPhone = formatPhone(phone);
    if (normalizedPhone && !isPhoneValid(normalizedPhone)) {
      setError("Informe um telefone válido no formato (11) 99999-9999.");
      return;
    }
    const normalizedCarPlate = normalizeCarPlate(carPlate);
    if (!isCarPlateValid(normalizedCarPlate)) {
      setError("Informe uma placa válida no formato ABC-1234 ou ABC1D23.");
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
      setError(err instanceof Error ? err.message : "Não foi possível salvar seus dados.");
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
      setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
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
      setError(err instanceof Error ? err.message : "Não foi possível remover a foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!user) return null;

  return (
    <AppLayout title="Meu perfil">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-6 text-white shadow-xl">
          {/* subtle gradient blob */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-500/10 blur-2xl" />

          <div className="relative flex items-center gap-5">
            {/* avatar */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black tracking-tight ring-2 ring-white/10">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                title="Alterar foto"
                className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg transition hover:bg-indigo-400 disabled:opacity-60"
              >
                <Camera size={13} />
              </button>
            </div>

            {/* identity */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold">{name || "Sem nome"}</p>
              <p className="mt-0.5 truncate text-sm text-slate-400">{email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-sky-300">
                  <ShieldCheck size={11} />
                  {roleLabel[user.role ?? ""] ?? user.role}
                </span>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={avatarBusy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-400 transition hover:text-rose-400 disabled:opacity-60"
                  >
                    <Trash2 size={11} />
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Dados principais */}
          <div className="px-6 pt-6 pb-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <UserRound size={16} />
              </span>
              <p className="text-sm font-semibold text-slate-800">Dados principais</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Nome completo</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </label>
            </div>
          </div>

          <div className="mx-6 border-t border-slate-100" />

          {/* Contato */}
          <div className="px-6 py-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Phone size={16} />
              </span>
              <p className="text-sm font-semibold text-slate-800">Contato</p>
            </div>
            <label className="block sm:max-w-xs">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Telefone / WhatsApp</span>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-0000"
                pattern={PHONE_PATTERN}
                title={PHONE_INPUT_TITLE}
                inputMode="tel"
                maxLength={15}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mx-6 border-t border-slate-100" />

          {/* Veículo e pets */}
          <div className="px-6 py-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CarFront size={16} />
              </span>
              <p className="text-sm font-semibold text-slate-800">Veículo e pets</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Placa do carro</span>
                <input
                  value={carPlate}
                  onChange={(e) => setCarPlate(formatCarPlate(e.target.value))}
                  placeholder="ABC-1234"
                  pattern={CAR_PLATE_PATTERN}
                  title={CAR_PLATE_INPUT_TITLE}
                  maxLength={8}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1"><PawPrint size={12} /> Número de pets</span>
                </span>
                <input
                  type="number"
                  min={0}
                  value={petsCount}
                  onChange={(e) => setPetsCount(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          {/* Footer de ações */}
          <div className="flex flex-col gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5 text-sm font-medium">
              {saved && <span className="flex items-center gap-1.5 text-emerald-600"><Mail size={13} />Dados atualizados.</span>}
              {error && <span className="text-rose-600">{error}</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => nav(-1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Save size={15} />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
