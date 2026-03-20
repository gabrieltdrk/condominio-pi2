import { useEffect, useMemo, useRef, useState } from "react";
import { MailCheck, Plus, QrCode, ScanLine, ShieldCheck, Users, X } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../features/predio/services/predio";
import {
  cancelVisitorRequest,
  completeVisitorCheckOut,
  createVisitorRequest,
  listVisitorRequests,
  subscribeToVisitorRequests,
  validateVisitorAccessToken,
  type VisitorGuestInput,
  type VisitorRequest,
  type VisitorRequestStatus,
} from "../features/visitors/services/visitors";

const inputClass = "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const areaClass = "w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

const STATUS_META: Record<VisitorRequestStatus, { label: string; tone: string }> = {
  PENDENTE_CONFIRMACAO: { label: "Aguardando confirmacao", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  CONFIRMADO: { label: "Confirmado", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  VALIDADO_MORADOR: { label: "Validado pelo morador", tone: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  CHECKED_IN: { label: "Check-in concluido", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CHECKED_OUT: { label: "Check-out concluido", tone: "border-slate-200 bg-slate-100 text-slate-600" },
  CANCELADO: { label: "Cancelado", tone: "border-rose-200 bg-rose-50 text-rose-700" },
};

const emptyGuest = (): VisitorGuestInput => ({ fullName: "", birthDate: "", cpf: "", email: "" });

function apartmentLabel(option: BuildingApartmentOption) {
  return `${option.tower} · Andar ${option.level} · Ap ${option.number}`;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function parseScannedToken(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("omni-visit:")) return value.slice("omni-visit:".length).trim();
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) return new URL(value).searchParams.get("token") ?? value;
  } catch {
    return value;
  }
  return value;
}

function isGuestValid(guest: VisitorGuestInput, requireEmail: boolean) {
  return guest.fullName.trim().length >= 3 && guest.birthDate && guest.cpf.replace(/\D/g, "").length === 11 && (!requireEmail || guest.email.trim().length > 4);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function localDateTime(hoursAhead: number) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ScannerModal({ title, onClose, onSubmit, submitting }: { title: string; onClose: () => void; onSubmit: (token: string) => Promise<void>; submitting: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualToken, setManualToken] = useState("");

  useEffect(() => {
    let timer: number | null = null;
    let active = true;
    async function start() {
      const detectorApi = window as typeof window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } };
      if (!detectorApi.BarcodeDetector || !navigator.mediaDevices?.getUserMedia || !videoRef.current || !canvasRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (!active || !videoRef.current) return;
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new detectorApi.BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!active || !videoRef.current || !canvasRef.current) return;
        if (videoRef.current.readyState < 2) {
          timer = window.setTimeout(scan, 500);
          return;
        }
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const token = parseScannedToken((await detector.detect(canvas))[0]?.rawValue ?? "");
        if (token) {
          await onSubmit(token);
          return;
        }
        timer = window.setTimeout(scan, 700);
      };
      await scan();
    }
    void start();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    };
  }, [onSubmit]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl rounded-[30px] border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">Use a camera ou informe o codigo manualmente.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.9fr]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
            <video ref={videoRef} className="min-h-72 w-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <textarea rows={7} value={manualToken} onChange={(event) => setManualToken(event.target.value)} className={areaClass} placeholder="Cole aqui o token ou a URL do QR code" />
            <button type="button" onClick={() => void onSubmit(parseScannedToken(manualToken))} disabled={submitting} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
              {submitting ? "Validando..." : "Validar codigo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VisitantesPage() {
  const user = useMemo(() => getUser(), []);
  const canCreate = user?.role === "ADMIN" || user?.role === "MORADOR";
  const isGatekeeper = user?.role === "PORTEIRO";
  const [requests, setRequests] = useState<VisitorRequest[]>([]);
  const [apartments, setApartments] = useState<BuildingApartmentOption[]>([]);
  const [form, setForm] = useState({
    apartmentId: null as string | null,
    adultsCount: 1,
    childrenCount: 0,
    petsCount: 0,
    expectedCheckIn: localDateTime(0),
    expectedCheckOut: localDateTime(3),
    requiresPortariaQr: true,
    notes: "",
    guests: [emptyGuest()],
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState<null | "resident" | "gatekeeper">(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scannerSaving, setScannerSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function loadPage() {
    setLoading(true);
    try {
      const [loadedRequests, loadedApartments] = await Promise.all([listVisitorRequests(), listBuildingApartmentOptions()]);
      setRequests(loadedRequests);
      setApartments(loadedApartments);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar visitantes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    return subscribeToVisitorRequests(() => void loadPage());
  }, []);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((request) => {
      const guests = request.guests.map((guest) => `${guest.fullName} ${guest.cpf} ${guest.email}`.toLowerCase()).join(" ");
      return `${request.residentName} ${request.apartmentLabel} ${STATUS_META[request.status].label}`.toLowerCase().includes(term) || guests.includes(term);
    });
  }, [requests, search]);

  const metrics = useMemo(() => ({
    pending: requests.filter((request) => request.status === "PENDENTE_CONFIRMACAO").length,
    confirmed: requests.filter((request) => ["CONFIRMADO", "VALIDADO_MORADOR"].includes(request.status)).length,
    checkedIn: requests.filter((request) => request.status === "CHECKED_IN").length,
    qrAtGate: requests.filter((request) => request.requiresPortariaQr).length,
  }), [requests]);

  function updateGuest(index: number, patch: Partial<VisitorGuestInput>) {
    setForm((current) => ({ ...current, guests: current.guests.map((guest, guestIndex) => guestIndex === index ? { ...guest, ...patch } : guest) }));
  }

  function addGuest() {
    setForm((current) => ({ ...current, guests: [...current.guests, emptyGuest()] }));
  }

  function removeGuest(index: number) {
    setForm((current) => ({ ...current, guests: current.guests.filter((_, guestIndex) => guestIndex !== index) }));
  }

  function resetForm() {
    setForm({
      apartmentId: apartments[0]?.id ?? null,
      adultsCount: 1,
      childrenCount: 0,
      petsCount: 0,
      expectedCheckIn: localDateTime(0),
      expectedCheckOut: localDateTime(3),
      requiresPortariaQr: true,
      notes: "",
      guests: [emptyGuest()],
    });
    setFormError("");
  }

  async function handleCreate() {
    const invalidIndex = form.guests.findIndex((guest, index) => !isGuestValid(guest, index === 0));
    if (!form.apartmentId) return setFormError("Selecione a unidade da visita.");
    if (invalidIndex >= 0) return setFormError(`Revise os dados do visitante ${invalidIndex + 1}.`);
    if (form.adultsCount + form.childrenCount <= 0) return setFormError("Informe ao menos um adulto ou crianca.");
    if (new Date(form.expectedCheckOut) <= new Date(form.expectedCheckIn)) return setFormError("Check-out deve ser maior que check-in.");

    setSaving(true);
    setFormError("");
    setMessage("");
    try {
      const result = await createVisitorRequest({
        apartmentId: form.apartmentId,
        adultsCount: form.adultsCount,
        childrenCount: form.childrenCount,
        petsCount: form.petsCount,
        expectedCheckIn: new Date(form.expectedCheckIn).toISOString(),
        expectedCheckOut: new Date(form.expectedCheckOut).toISOString(),
        requiresPortariaQr: form.requiresPortariaQr,
        notes: form.notes,
        guests: form.guests.map((guest, index) => ({ ...guest, isPrimary: index === 0 })),
      });
      setModalOpen(false);
      setMessage(result.emailQueued ? "Visita cadastrada e e-mail enviado ao visitante principal." : "Visita cadastrada, mas o envio do e-mail falhou.");
      resetForm();
      await loadPage();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao cadastrar visita.");
    } finally {
      setSaving(false);
    }
  }

  async function handleScan(token: string) {
    if (!token) return setError("Informe um QR code valido.");
    setScannerSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await validateVisitorAccessToken(token);
      setScannerOpen(null);
      setMessage(result.actor === "resident" ? "QR validado pelo morador." : "QR validado na portaria.");
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao validar QR.");
    } finally {
      setScannerSaving(false);
    }
  }

  return (
    <AppLayout title="Visitantes">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#ffffff_42%,_#eef2ff_100%)] p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700"><ShieldCheck size={13} /> Fluxo de visitantes</div>
              <h2 className="mt-4 max-w-3xl text-[clamp(1.9rem,4vw,3.2rem)] font-black leading-none tracking-[-0.05em] text-slate-950">Cadastro manual, aprovacao por e-mail e autenticacao por QR code.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">O visitante principal recebe o convite por e-mail, confirma a visita e depois apresenta o QR code para validacao na portaria ou pelo morador.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {canCreate && <button type="button" onClick={() => { resetForm(); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus size={16} /> Nova visita</button>}
                <button type="button" onClick={() => setScannerOpen(isGatekeeper ? "gatekeeper" : "resident")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><ScanLine size={16} /> {isGatekeeper ? "Validar QR na portaria" : "Validar QR"}</button>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-900/5 bg-slate-950 p-6 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200/80">Resumo operacional</p>
              <p className="mt-3 text-[clamp(2rem,4vw,3.3rem)] font-black leading-none tracking-[-0.06em]">{requests.length} visitas</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pendentes</p><p className="mt-2 text-2xl font-black">{metrics.pending}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Check-ins</p><p className="mt-2 text-2xl font-black">{metrics.checkedIn}</p></div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{isGatekeeper ? "Seu perfil possui acesso restrito a garagem e visitantes." : "Quando o visitante aprova o convite, o morador recebe notificacao no sistema."}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { icon: MailCheck, label: "Pendentes", value: metrics.pending, helper: "Aguardando resposta do visitante principal", tone: "border-amber-100 bg-amber-50 text-amber-700" },
            { icon: Users, label: "Confirmadas", value: metrics.confirmed, helper: "Visitantes que ja aprovaram o e-mail", tone: "border-sky-100 bg-sky-50 text-sky-700" },
            { icon: QrCode, label: "QR na portaria", value: metrics.qrAtGate, helper: "Exigem leitura do QR na entrada", tone: "border-indigo-100 bg-indigo-50 text-indigo-700" },
            { icon: ScanLine, label: "Check-ins", value: metrics.checkedIn, helper: "Entradas autenticadas com sucesso", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
          ].map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className={`rounded-[28px] border p-5 shadow-sm ${item.tone}`}><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm"><Icon size={20} /></div><p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{item.value}</p><p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p></div>;
          })}
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h3 className="text-base font-semibold text-slate-900">Gestao de visitantes</h3><p className="mt-1 text-sm text-slate-500">Acompanhe aprovacao, janela prevista e fluxo de check-in em uma visualizacao unica.</p></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por visitante, CPF, morador ou unidade" className={`${inputClass} max-w-md`} />
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {loading ? <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando visitantes...</div> : filteredRequests.map((request) => {
              const meta = STATUS_META[request.status];
              const canResidentValidate = !request.requiresPortariaQr && request.status === "CONFIRMADO" && !isGatekeeper;
              const canGatekeeperValidate = request.requiresPortariaQr && request.status === "CONFIRMADO" && (isGatekeeper || user?.role === "ADMIN");
              const canCheckOut = request.status === "CHECKED_IN" && (isGatekeeper || user?.role === "ADMIN");
              return (
                <article key={request.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.tone}`}>{meta.label}</div>
                      <h4 className="mt-3 text-lg font-semibold text-slate-950">{request.primaryGuest?.fullName ?? "Visitante principal"}</h4>
                      <p className="mt-1 text-sm text-slate-500">{request.apartmentLabel} · Morador: {request.residentName}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Janela</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatDateTime(request.expectedCheckIn)}</p><p className="text-xs text-slate-500">{formatDateTime(request.expectedCheckOut)}</p></div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{request.adultsCount} adultos · {request.childrenCount} criancas</div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{request.petsCount} animais</div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{request.requiresPortariaQr ? "QR na portaria" : "QR pelo morador"}</div>
                  </div>
                  <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-900">Visitantes cadastrados</p><div className="mt-3 space-y-2">{request.guests.map((guest) => <div key={guest.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><span>{guest.fullName}{guest.isPrimary ? " · principal" : ""}</span><span>{guest.cpf}</span></div>)}</div></div>
                  {request.notes && <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{request.notes}</div>}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {canResidentValidate && <button type="button" onClick={() => setScannerOpen("resident")} className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Validar QR como morador</button>}
                    {canGatekeeperValidate && <button type="button" onClick={() => setScannerOpen("gatekeeper")} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Registrar check-in</button>}
                    {canCheckOut && <button type="button" onClick={() => void completeVisitorCheckOut(request.id).then(loadPage).then(() => setMessage("Check-out registrado com sucesso.")).catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao registrar check-out."))} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Registrar check-out</button>}
                    {canCreate && ["PENDENTE_CONFIRMACAO", "CONFIRMADO"].includes(request.status) && <button type="button" onClick={() => void cancelVisitorRequest(request.id).then(loadPage).then(() => setMessage("Visita cancelada com sucesso.")).catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao cancelar visita."))} className="rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Cancelar visita</button>}
                  </div>
                </article>
              );
            })}
            {!loading && filteredRequests.length === 0 && <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Nenhuma visita encontrada.</div>}
          </div>
        </section>

        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Cadastro manual</p><h3 className="mt-2 text-xl font-semibold text-slate-950">Nova visita</h3><p className="mt-1 text-sm text-slate-500">O primeiro visitante sera o principal e recebera os e-mails da jornada.</p></div><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><Users size={20} /></div><div><h4 className="text-sm font-semibold text-slate-900">Visitantes</h4><p className="text-xs text-slate-500">Cadastre uma ou mais pessoas para a mesma visita.</p></div></div>
                  <div className="mt-4 space-y-4">
                    {form.guests.map((guest, index) => <div key={`guest-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">{index === 0 ? "Visitante principal" : `Visitante ${index + 1}`}</div>{index > 0 && <button type="button" onClick={() => removeGuest(index)} className="text-xs font-semibold text-rose-600">Remover</button>}</div><div className="mt-4 grid gap-3 md:grid-cols-2"><input value={guest.fullName} onChange={(event) => updateGuest(index, { fullName: event.target.value })} className={inputClass} placeholder="Nome completo" /><input type="date" value={guest.birthDate} onChange={(event) => updateGuest(index, { birthDate: event.target.value })} className={inputClass} /><input value={guest.cpf} onChange={(event) => updateGuest(index, { cpf: formatCpf(event.target.value) })} className={inputClass} placeholder="CPF" /><input type="email" value={guest.email} onChange={(event) => updateGuest(index, { email: event.target.value })} className={inputClass} placeholder={index === 0 ? "E-mail do visitante principal" : "E-mail opcional"} /></div></div>)}
                  </div>
                  <button type="button" onClick={addGuest} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"><Plus size={16} /> Adicionar visitante</button>
                </section>
                <section className="space-y-5">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><h4 className="text-sm font-semibold text-slate-900">Dados da visita</h4><div className="mt-4 grid gap-3"><select value={form.apartmentId ?? ""} onChange={(event) => setForm((current) => ({ ...current, apartmentId: event.target.value || null }))} className={inputClass}><option value="">Selecionar unidade</option>{apartments.map((option) => <option key={option.id} value={option.id}>{apartmentLabel(option)}</option>)}</select><div className="grid gap-3 sm:grid-cols-3"><input type="number" min={0} value={form.adultsCount} onChange={(event) => setForm((current) => ({ ...current, adultsCount: Number(event.target.value) }))} className={inputClass} placeholder="Adultos" /><input type="number" min={0} value={form.childrenCount} onChange={(event) => setForm((current) => ({ ...current, childrenCount: Number(event.target.value) }))} className={inputClass} placeholder="Criancas" /><input type="number" min={0} value={form.petsCount} onChange={(event) => setForm((current) => ({ ...current, petsCount: Number(event.target.value) }))} className={inputClass} placeholder="Animais" /></div><input type="datetime-local" value={form.expectedCheckIn} onChange={(event) => setForm((current) => ({ ...current, expectedCheckIn: event.target.value }))} className={inputClass} /><input type="datetime-local" value={form.expectedCheckOut} onChange={(event) => setForm((current) => ({ ...current, expectedCheckOut: event.target.value }))} className={inputClass} /><textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={areaClass} placeholder="Observacoes para a portaria" /></div></div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-semibold text-slate-900">Validacao do QR</p><div className="mt-4 grid gap-3"><button type="button" onClick={() => setForm((current) => ({ ...current, requiresPortariaQr: true }))} className={`rounded-[24px] border p-4 text-left transition ${form.requiresPortariaQr ? "border-emerald-300 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}><p className="text-sm font-semibold text-slate-900">QR apresentado na portaria</p><p className="mt-1 text-xs text-slate-500">O porteiro valida o check-in lendo o QR code.</p></button><button type="button" onClick={() => setForm((current) => ({ ...current, requiresPortariaQr: false }))} className={`rounded-[24px] border p-4 text-left transition ${!form.requiresPortariaQr ? "border-indigo-300 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}><p className="text-sm font-semibold text-slate-900">QR validado pelo morador</p><p className="mt-1 text-xs text-slate-500">O morador escaneia o QR code para autenticar a visita.</p></button></div></div>
                </section>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">{formError && <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</p>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end"><button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancelar</button><button type="button" onClick={() => void handleCreate()} disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar visita"}</button></div></div>
          </div>
        </div>
      )}

      {scannerOpen && <ScannerModal title={scannerOpen === "gatekeeper" ? "Leitura do QR na portaria" : "Leitura do QR pelo morador"} onClose={() => setScannerOpen(null)} onSubmit={handleScan} submitting={scannerSaving} />}
    </AppLayout>
  );
}
