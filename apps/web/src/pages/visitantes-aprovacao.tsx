import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, LoaderCircle, QrCode } from "lucide-react";
import { approveVisitorByToken } from "../features/visitors/services/visitors";

export default function VisitorApprovalPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [state, setState] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "Estamos confirmando sua visita." : "Link de confirmacao invalido.");

  useEffect(() => {
    if (!token) return;
    let active = true;

    approveVisitorByToken(token)
      .then((result) => {
        if (!active) return;
        setState("success");
        setMessage(
          result.requiresPortariaQr
            ? "Visita confirmada. O visitante principal recebera um novo e-mail com o QR code para apresentar na portaria."
            : "Visita confirmada. O visitante principal recebera um novo e-mail com o QR code para validacao pelo morador.",
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Nao foi possivel confirmar esta visita.");
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-4 py-8">
      <section className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)]">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${state === "success" ? "bg-emerald-100 text-emerald-700" : state === "error" ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>
          {state === "loading" ? <LoaderCircle size={28} className="animate-spin" /> : state === "success" ? <BadgeCheck size={28} /> : <QrCode size={28} />}
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Confirmacao de visita</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
          {state === "success" ? "Tudo certo." : state === "loading" ? "Validando..." : "Nao foi possivel confirmar"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{message}</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Se necessario, encaminhe esta tela ao morador ou entre em contato com a administracao do condominio.
        </div>
        <Link to="/login" className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Ir para o app
        </Link>
      </section>
    </main>
  );
}
