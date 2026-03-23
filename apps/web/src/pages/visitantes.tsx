import { useEffect, useMemo, useRef, useState } from "react";
import { MailCheck, Plus, QrCode, ScanLine, ShieldCheck, Trash2, Users, X } from "lucide-react";
import jsQR from "jsqr";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../features/predio/services/predio";
import {
  cancelVisitorRequest,
  completeVisitorCheckOut,
  createVisitorRequest,
  deleteVisitorRequest,
  listVisitorRequests,
  subscribeToVisitorRequests,
  validateVisitorAccessToken,
  type VisitorGuestInput,
  type VisitorRequest,
  type VisitorRequestStatus,
} from "../features/visitors/services/visitors";

const inputClass = "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const areaClass = "w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

const STATUS_META: Record<VisitorRequestStatus, { label: string; tone: string }> = {
  PENDENTE_CONFIRMACAO: { label: "Aguardando confirmação", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  CONFIRMADO: { label: "Confirmado", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  VALIDADO_MORADOR: { label: "Validado pelo morador", tone: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  CHECKED_IN: { label: "Check-in concluído", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CHECKED_OUT: { label: "Check-out concluído", tone: "border-slate-200 bg-slate-100 text-slate-600" },
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

function FieldLabel({ children }: { children: string }) {
  return <label className={labelClass}>{children}</label>;
}

function ScannerModal({ title, onClose, onSubmit, submitting }: { title: string; onClose: () => void; onSubmit: (token: string) => Promise<void>; submitting: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [cameraMessage, setCameraMessage] = useState("Abrindo câmera traseira para leitura do QR code.");
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    let active = true;

    function stopCamera() {
      if (timer) window.clearTimeout(timer);
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    if (manualOpen) {
      stopCamera();
      return () => stopCamera();
    }

    async function start() {
      const detectorApi = window as typeof window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } };
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current || !canvasRef.current) {
        setCameraMessage("Seu navegador não permite abrir a câmera neste dispositivo. Use a validação manual abaixo.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active || !videoRef.current) return;
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraMessage("Aponte a câmera para o QR code do visitante.");
        const detector = detectorApi.BarcodeDetector ? new detectorApi.BarcodeDetector({ formats: ["qr_code"] }) : null;
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
          const nativeToken = detector ? parseScannedToken((await detector.detect(canvas))[0]?.rawValue ?? "") : "";
          if (nativeToken) {
            await onSubmit(nativeToken);
            return;
          }
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const fallbackToken = parseScannedToken(jsQR(image.data, image.width, image.height)?.data ?? "");
          if (fallbackToken) {
            await onSubmit(fallbackToken);
            return;
          }
          timer = window.setTimeout(scan, 700);
        };
        await scan();
      } catch {
        setCameraMessage("Não foi possível acessar a câmera. Verifique a permissão do navegador ou use a validação manual abaixo.");
      }
    }

    void start();
    return () => {
      active = false;
      stopCamera();
    };
  }, [manualOpen, onSubmit]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/70 p-0 sm:p-4">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-w-3xl sm:rounded-[30px] sm:border sm:border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:pt-5">
            <h3 className="m-0 text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{manualOpen ? "Cole o token manualmente para validar o acesso." : "Use a câmera para ler o QR code do visitante."}</p>
          </div>
          <button type="button" onClick={onClose} className="mr-4 mt-[max(1rem,env(safe-area-inset-top))] rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:mr-5 sm:mt-5"><X size={18} /></button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-5 md:grid-cols-[1fr_0.9fr]">
          {!manualOpen && <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950"><video ref={videoRef} className="h-[42dvh] w-full object-cover sm:min-h-72 sm:h-auto" muted playsInline autoPlay /><canvas ref={canvasRef} className="hidden" /></div>}
          {manualOpen && <div className="flex items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500">A leitura por câmera foi ocultada para facilitar a validação manual no mobile.</div>}
          <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">{cameraMessage}</p>
            {!manualOpen && <button type="button" onClick={() => { setCameraMessage("Cole o token manualmente para validar o acesso."); setManualOpen(true); }} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Colar token manualmente</button>}
            {manualOpen && <>
              <textarea rows={6} value={manualToken} onChange={(event) => setManualToken(event.target.value)} className={`${areaClass} min-h-40`} placeholder="Cole aqui o token ou a URL do QR code" />
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => void onSubmit(parseScannedToken(manualToken))} disabled={submitting} className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{submitting ? "Validando..." : "Validar código"}</button>
                <button type="button" onClick={() => { setManualOpen(false); setManualToken(""); setCameraMessage("Abrindo câmera traseira para leitura do QR code."); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Voltar para câmera</button>
              </div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitorDetailsModal({
  request,
  onClose,
}: {
  request: VisitorRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_META[request.status].tone}`}>{STATUS_META[request.status].label}</div>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">{request.primaryGuest?.fullName ?? "Visitante principal"}</h3>
            <p className="mt-1 text-sm text-slate-500">{request.apartmentLabel} · Morador: {request.residentName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Janela da visita</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Check-in: {formatDateTime(request.expectedCheckIn)}</p>
              <p className="mt-1 text-sm text-slate-600">Check-out: {formatDateTime(request.expectedCheckOut)}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Resumo</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{request.adultsCount} adultos · {request.childrenCount} criancas</p>
              <p className="mt-1 text-sm text-slate-600">{request.petsCount} animais · {request.requiresPortariaQr ? "QR na portaria" : "QR pelo morador"}</p>
            </div>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Visitantes cadastrados</p>
            <div className="mt-3 space-y-2">
              {request.guests.map((guest) => (
                <div key={guest.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                    <span>{guest.fullName}{guest.isPrimary ? " · principal" : ""}</span>
                    <span>{guest.cpf}</span>
                  </div>
                  {guest.email ? <p className="mt-1 text-xs text-slate-500">{guest.email}</p> : null}
                </div>
              ))}
            </div>
          </div>
          {request.notes ? <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">{request.notes}</div> : null}
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
  const [statusFilter, setStatusFilter] = useState<VisitorRequestStatus | "TODOS">("TODOS");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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
    return requests.filter((request) => {
      if (statusFilter !== "TODOS" && request.status !== statusFilter) return false;
      if (!term) return true;
      const guests = request.guests.map((guest) => `${guest.fullName} ${guest.cpf} ${guest.email}`.toLowerCase()).join(" ");
      return `${request.residentName} ${request.apartmentLabel} ${STATUS_META[request.status].label}`.toLowerCase().includes(term) || guests.includes(term);
    });
  }, [requests, search, statusFilter]);

  const metrics = useMemo(() => ({
    pending: requests.filter((request) => request.status === "PENDENTE_CONFIRMACAO").length,
    confirmed: requests.filter((request) => ["CONFIRMADO", "VALIDADO_MORADOR"].includes(request.status)).length,
    checkedIn: requests.filter((request) => request.status === "CHECKED_IN").length,
    qrAtGate: requests.filter((request) => request.requiresPortariaQr).length,
  }), [requests]);

  const selectedRequest = selectedRequestId ? requests.find((request) => request.id === selectedRequestId) ?? null : null;

  const availableApartments = useMemo(() => {
    if (user?.role === "ADMIN") return apartments;
    if (user?.role === "MORADOR") return apartments.filter((option) => option.residentId === user.id);
    return [];
  }, [apartments, user]);

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
      apartmentId: availableApartments[0]?.id ?? null,
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

  useEffect(() => {
    setForm((current) => {
      if (user?.role !== "MORADOR") return current;
      if (current.apartmentId && availableApartments.some((option) => option.id === current.apartmentId)) return current;
      return { ...current, apartmentId: availableApartments[0]?.id ?? null };
    });
  }, [availableApartments, user?.role]);

  async function handleCreate() {
    const invalidIndex = form.guests.findIndex((guest, index) => !isGuestValid(guest, index === 0));
    if (!form.apartmentId) return setFormError("Selecione a unidade da visita.");
    if (invalidIndex >= 0) return setFormError(`Revise os dados do visitante ${invalidIndex + 1}.`);
    if (form.adultsCount + form.childrenCount <= 0) return setFormError("Informe ao menos um adulto ou uma criança.");
    if (new Date(form.expectedCheckOut) <= new Date(form.expectedCheckIn)) return setFormError("O check-out deve ser maior que o check-in.");

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
    if (!token) return setError("Informe um QR code válido.");
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

  async function handleDelete(requestId: string) {
    setError("");
    setMessage("");
    try {
      await deleteVisitorRequest(requestId);
      setMessage("Reserva excluída com sucesso.");
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir reserva.");
    }
  }

  return (
    <AppLayout title="Visitantes">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#ffffff_42%,_#eef2ff_100%)] p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700"><ShieldCheck size={13} /> Fluxo de visitantes</div>
              <h2 className="mt-4 max-w-3xl text-[clamp(1.9rem,4vw,3.2rem)] font-black leading-none tracking-[-0.05em] text-slate-950">Cadastro manual, aprovação por e-mail e autenticação por QR code.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">O visitante principal recebe o convite por e-mail, confirma a visita e depois apresenta o QR code para validação na portaria ou pelo morador.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {canCreate && <button type="button" onClick={() => { resetForm(); setModalOpen(true); }} disabled={user?.role === "MORADOR" && availableApartments.length === 0} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><Plus size={16} /> Nova visita</button>}
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
              <p className="mt-4 text-sm leading-6 text-slate-300">{isGatekeeper ? "Seu perfil possui acesso restrito a garagem e visitantes." : "Quando o visitante aprova o convite, o morador recebe notificação no sistema."}</p>
              {user?.role === "MORADOR" && availableApartments.length === 0 && <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">Vincule uma unidade ao morador para liberar o cadastro de visitantes.</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { icon: MailCheck, label: "Pendentes", value: metrics.pending, helper: "Aguardando resposta do visitante principal", tone: "border-amber-100 bg-amber-50 text-amber-700" },
            { icon: Users, label: "Confirmadas", value: metrics.confirmed, helper: "Visitantes que já aprovaram o e-mail", tone: "border-sky-100 bg-sky-50 text-sky-700" },
            { icon: QrCode, label: "QR na portaria", value: metrics.qrAtGate, helper: "Exigem leitura do QR na entrada", tone: "border-indigo-100 bg-indigo-50 text-indigo-700" },
            { icon: ScanLine, label: "Check-ins", value: metrics.checkedIn, helper: "Entradas autenticadas com sucesso", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
          ].map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className={`rounded-[28px] border p-5 shadow-sm ${item.tone}`}><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm"><Icon size={20} /></div><p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{item.value}</p><p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p></div>;
          })}
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h3 className="text-base font-semibold text-slate-900">Gestão de visitantes</h3><p className="mt-1 text-sm text-slate-500">Acompanhe aprovação, janela prevista e fluxo de check-in em uma visualização única.</p></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por visitante, CPF, morador ou unidade" className={`${inputClass} max-w-md`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStatusFilter("TODOS")} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${statusFilter === "TODOS" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>Todas ({requests.length})</button>
              {Object.entries(STATUS_META).map(([value, meta]) => <button key={value} type="button" onClick={() => setStatusFilter(value as VisitorRequestStatus)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${statusFilter === value ? meta.tone : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{meta.label}</button>)}
            </div>
          </div>
          <div className="hidden mt-5 space-y-3">
            {loading ? <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando visitantes...</div> : filteredRequests.map((request) => {
              const meta = STATUS_META[request.status];
              const canResidentValidate = !request.requiresPortariaQr && request.status === "CONFIRMADO" && !isGatekeeper;
              const canGatekeeperValidate = request.requiresPortariaQr && request.status === "CONFIRMADO" && (isGatekeeper || user?.role === "ADMIN");
              const canCheckOut = request.status === "CHECKED_IN" && (isGatekeeper || user?.role === "ADMIN");
              const canDelete = canCreate && request.status === "CANCELADO";
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
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{request.adultsCount} adultos · {request.childrenCount} crianças</div>
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
                    {canDelete && <button type="button" onClick={() => void handleDelete(request.id)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Trash2 size={15} /> Excluir registro</button>}
                  </div>
                </article>
              );
            })}
            {!loading && filteredRequests.length === 0 && <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Nenhuma visita encontrada.</div>}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            {loading ? <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando visitantes...</div> : filteredRequests.map((request) => {
              const meta = STATUS_META[request.status];
              const canResidentValidate = !request.requiresPortariaQr && request.status === "CONFIRMADO" && !isGatekeeper;
              const canGatekeeperValidate = request.requiresPortariaQr && request.status === "CONFIRMADO" && (isGatekeeper || user?.role === "ADMIN");
              const canCheckOut = request.status === "CHECKED_IN" && (isGatekeeper || user?.role === "ADMIN");
              const canDelete = canCreate && request.status === "CANCELADO";
              return (
                <article key={`compact-${request.id}`} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${meta.tone}`}>{meta.label}</span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">{request.requiresPortariaQr ? "QR na portaria" : "QR pelo morador"}</span>
                      </div>
                      <h4 className="mt-3 truncate text-base font-semibold text-slate-950">{request.primaryGuest?.fullName ?? "Visitante principal"}</h4>
                      <p className="mt-1 truncate text-sm text-slate-500">{request.apartmentLabel} · Morador: {request.residentName}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span>Entrada: {formatDateTime(request.expectedCheckIn)}</span>
                        <span>Saida: {formatDateTime(request.expectedCheckOut)}</span>
                        <span>{request.adultsCount} adultos · {request.childrenCount} criancas · {request.petsCount} animais</span>
                        <span>{request.guests.length} visitantes cadastrados</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button type="button" onClick={() => setSelectedRequestId(request.id)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Ver detalhes</button>
                      {canResidentValidate && <button type="button" onClick={() => setScannerOpen("resident")} className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Validar QR</button>}
                      {canGatekeeperValidate && <button type="button" onClick={() => setScannerOpen("gatekeeper")} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Registrar check-in</button>}
                      {canCheckOut && <button type="button" onClick={() => void completeVisitorCheckOut(request.id).then(loadPage).then(() => setMessage("Check-out registrado com sucesso.")).catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao registrar check-out."))} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Check-out</button>}
                      {canCreate && ["PENDENTE_CONFIRMACAO", "CONFIRMADO"].includes(request.status) && <button type="button" onClick={() => void cancelVisitorRequest(request.id).then(loadPage).then(() => setMessage("Visita cancelada com sucesso.")).catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao cancelar visita."))} className="rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Cancelar</button>}
                      {canDelete && <button type="button" onClick={() => void handleDelete(request.id)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Trash2 size={15} /> Excluir</button>}
                    </div>
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
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Cadastro manual</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Nova visita</h3>
                <p className="mt-1 text-sm text-slate-500">O primeiro visitante será o principal e receberá os e-mails da jornada.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><Users size={20} /></div>
                    <div><h4 className="text-sm font-semibold text-slate-900">Visitantes</h4><p className="text-xs text-slate-500">Cadastre uma ou mais pessoas para a mesma visita.</p></div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {form.guests.map((guest, index) => (
                      <div key={`guest-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">{index === 0 ? "Visitante principal" : `Visitante ${index + 1}`}</div>
                          {index > 0 && <button type="button" onClick={() => removeGuest(index)} className="text-xs font-semibold text-rose-600">Remover</button>}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="space-y-2"><FieldLabel>Nome completo</FieldLabel><input value={guest.fullName} onChange={(event) => updateGuest(index, { fullName: event.target.value })} className={inputClass} placeholder="Nome completo do visitante" /></div>
                          <div className="space-y-2"><FieldLabel>Data de nascimento</FieldLabel><input type="date" value={guest.birthDate} onChange={(event) => updateGuest(index, { birthDate: event.target.value })} className={inputClass} /></div>
                          <div className="space-y-2"><FieldLabel>CPF</FieldLabel><input value={guest.cpf} onChange={(event) => updateGuest(index, { cpf: formatCpf(event.target.value) })} className={inputClass} placeholder="000.000.000-00" /></div>
                          <div className="space-y-2"><FieldLabel>{index === 0 ? "E-mail do visitante principal" : "E-mail do visitante"}</FieldLabel><input type="email" value={guest.email} onChange={(event) => updateGuest(index, { email: event.target.value })} className={inputClass} placeholder={index === 0 ? "email@exemplo.com" : "Opcional"} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addGuest} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"><Plus size={16} /> Adicionar visitante</button>
                </section>
                <section className="space-y-5">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">Dados da visita</h4>
                    <div className="mt-4 grid gap-4">
                      <div className="space-y-2">
                        <FieldLabel>Unidade da visita</FieldLabel>
                        <select value={form.apartmentId ?? ""} onChange={(event) => setForm((current) => ({ ...current, apartmentId: event.target.value || null }))} className={inputClass}>
                          <option value="">Selecionar unidade</option>
                          {availableApartments.map((option) => <option key={option.id} value={option.id}>{apartmentLabel(option)}</option>)}
                        </select>
                        {user?.role === "MORADOR" && <p className="text-xs leading-5 text-slate-500">{availableApartments.length > 1 ? "Escolha qual das suas unidades receberá esta visita." : "Sua unidade vinculada foi selecionada para este cadastro."}</p>}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2"><FieldLabel>Adultos</FieldLabel><input type="number" min={0} value={form.adultsCount} onChange={(event) => setForm((current) => ({ ...current, adultsCount: Number(event.target.value) }))} className={inputClass} placeholder="Quantidade de adultos" /></div>
                        <div className="space-y-2"><FieldLabel>Crianças</FieldLabel><input type="number" min={0} value={form.childrenCount} onChange={(event) => setForm((current) => ({ ...current, childrenCount: Number(event.target.value) }))} className={inputClass} placeholder="Quantidade de crianças" /></div>
                        <div className="space-y-2"><FieldLabel>Animais de estimação</FieldLabel><input type="number" min={0} value={form.petsCount} onChange={(event) => setForm((current) => ({ ...current, petsCount: Number(event.target.value) }))} className={inputClass} placeholder="Quantidade de animais" /></div>
                      </div>
                      <div className="space-y-2"><FieldLabel>Check-in previsto</FieldLabel><input type="datetime-local" value={form.expectedCheckIn} onChange={(event) => setForm((current) => ({ ...current, expectedCheckIn: event.target.value }))} className={inputClass} /><p className="text-xs leading-5 text-slate-500">Informe a data e o horário previstos de chegada do visitante.</p></div>
                      <div className="space-y-2"><FieldLabel>Check-out previsto</FieldLabel><input type="datetime-local" value={form.expectedCheckOut} onChange={(event) => setForm((current) => ({ ...current, expectedCheckOut: event.target.value }))} className={inputClass} /><p className="text-xs leading-5 text-slate-500">Informe até quando a permanência do visitante está autorizada.</p></div>
                      <div className="space-y-2"><FieldLabel>Observações para a portaria</FieldLabel><textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={areaClass} placeholder="Ex.: visitante chegará de aplicativo, precisa de ajuda com bagagens, etc." /></div>
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Validação do QR</p>
                    <div className="mt-4 grid gap-3">
                      <button type="button" onClick={() => setForm((current) => ({ ...current, requiresPortariaQr: true }))} className={`rounded-[24px] border p-4 text-left transition ${form.requiresPortariaQr ? "border-emerald-300 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}><p className="text-sm font-semibold text-slate-900">QR apresentado na portaria</p><p className="mt-1 text-xs text-slate-500">O porteiro valida o check-in lendo o QR code.</p></button>
                      <button type="button" onClick={() => setForm((current) => ({ ...current, requiresPortariaQr: false }))} className={`rounded-[24px] border p-4 text-left transition ${!form.requiresPortariaQr ? "border-indigo-300 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}><p className="text-sm font-semibold text-slate-900">QR validado pelo morador</p><p className="mt-1 text-xs text-slate-500">O morador escaneia o QR code para autenticar a visita.</p></button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              {formError && <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</p>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={() => void handleCreate()} disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{saving ? "Salvando..." : "Cadastrar visita"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <VisitorDetailsModal request={selectedRequest} onClose={() => setSelectedRequestId(null)} />
      {scannerOpen && <ScannerModal title={scannerOpen === "gatekeeper" ? "Leitura do QR na portaria" : "Leitura do QR pelo morador"} onClose={() => setScannerOpen(null)} onSubmit={handleScan} submitting={scannerSaving} />}
    </AppLayout>
  );
}
