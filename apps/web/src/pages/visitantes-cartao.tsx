import { useEffect, useMemo, useState } from "react";
import { Copy, LoaderCircle, QrCode } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchVisitorAccessCard } from "../features/visitors/services/visitors";

type AccessCardState =
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | {
      status: "success";
      qrDataUrl: string;
      manualCode: string;
      expectedCheckIn: string;
      expectedCheckOut: string;
    };

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function VisitorAccessCardPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<AccessCardState>(
    token ? { status: "loading", message: "Estamos preparando o seu QR code." } : { status: "error", message: "Link de acesso invalido." },
  );

  useEffect(() => {
    if (!token) return;
    let active = true;

    fetchVisitorAccessCard(token)
      .then((result) => {
        if (!active) return;
        setState({
          status: "success",
          qrDataUrl: result.qrDataUrl,
          manualCode: result.manualCode,
          expectedCheckIn: result.expectedCheckIn,
          expectedCheckOut: result.expectedCheckOut,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Nao foi possivel abrir este QR code.",
        });
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleCopy() {
    if (state.status !== "success") return;
    try {
      await navigator.clipboard.writeText(state.manualCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-4 py-8">
      <section className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)]">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${state.status === "success" ? "bg-emerald-100 text-emerald-700" : state.status === "error" ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>
          {state.status === "loading" ? <LoaderCircle size={28} className="animate-spin" /> : <QrCode size={28} />}
        </div>
        <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Cartao de acesso</p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-[-0.04em] text-slate-950">
          {state.status === "success" ? "Seu QR code esta pronto" : state.status === "loading" ? "Carregando..." : "Nao foi possivel abrir"}
        </h1>

        {state.status === "success" ? (
          <>
            <p className="mt-4 text-center text-sm leading-7 text-slate-600">Apresente este QR code no horario da sua visita.</p>
            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-center">
              <img src={state.qrDataUrl} alt="QR code da visita" className="mx-auto w-full max-w-[280px]" />
            </div>
            <div className="mt-5 grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Check-in</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDateTime(state.expectedCheckIn)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Check-out</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDateTime(state.expectedCheckOut)}</p>
              </div>
            </div>
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Codigo manual</p>
              <p className="mt-2 break-all font-mono text-sm text-slate-800">{state.manualCode}</p>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Copy size={16} />
                {copied ? "Codigo copiado" : "Copiar codigo"}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            {state.message}
          </div>
        )}

        <Link to="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Ir para o app
        </Link>
      </section>
    </main>
  );
}
