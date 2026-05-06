import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { checkOAuthSession, login, resetPassword, type CondominioOption } from "../features/auth/services/auth";
import loginBg from "../assets/login.jpg";

type View = "login" | "forgot" | "sent";

export default function Login() {
  const nav = useNavigate();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErr, setForgotErr] = useState("");

  useEffect(() => {
    checkOAuthSession().then((user) => {
      if (user) nav("/dashboard", { replace: true });
    });
  }, [nav]);

  function openForgot() {
    setForgotEmail(email);
    setForgotErr("");
    setView("forgot");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.requiresSelection) {
        sessionStorage.setItem(
          "selectionData",
          JSON.stringify({
            condominios: result.condominios as CondominioOption[],
            userName: result.userName,
          }),
        );
        nav("/select-condominium", { replace: true });
        return;
      }

      nav("/dashboard", { replace: true });
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "Erro no login.");
    } finally {
      setLoading(false);
    }
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForgotErr("");
    setForgotLoading(true);

    try {
      await resetPassword(forgotEmail);
      setView("sent");
    } catch (error: unknown) {
      setForgotErr(error instanceof Error ? error.message : "Erro ao enviar email.");
    } finally {
      setForgotLoading(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-11 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="h-screen overflow-hidden bg-[#f5f7fb]">
      <div className="grid h-screen lg:grid-cols-[minmax(0,1fr)_minmax(500px,680px)]">
        <section className="relative hidden overflow-hidden lg:block">
          <img src={loginBg} alt="Painel lateral do login" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#223555]/88" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, transparent 18px, rgba(255,255,255,0.16) 19px, rgba(255,255,255,0.16) 20px, transparent 21px)",
              backgroundSize: "120px 120px",
            }}
          />

          <div className="relative flex h-full items-center justify-center p-10 text-center xl:p-14">
            <div className="max-w-2xl text-white">
              <h1 className="text-4xl font-bold tracking-tight xl:text-5xl">Gestão inteligente.</h1>
              <p className="mt-4 text-xl leading-relaxed text-slate-200 xl:text-2xl">
                A tranquilidade da Baixada Santista para o seu condomínio.
              </p>
            </div>
          </div>
        </section>

        <section className="flex h-screen items-center justify-center px-5 py-5 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px] space-y-3">
            {view !== "login" ? (
              <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-6 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#223555] text-white shadow-lg shadow-slate-200">
                  <Building2 size={26} />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">OmniLar</h2>
                <p className="mt-1.5 text-sm text-slate-400">Bem-vindo ao seu Lar digital.</p>
              </div>
            ) : null}

            {view === "login" ? (
              <>
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                  <div className="mb-5 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#223555] text-white shadow-lg shadow-slate-200">
                      <Building2 size={24} />
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-slate-900">OmniLar</h2>
                    <p className="mt-1.5 text-sm text-slate-400">Bem-vindo ao seu Lar digital.</p>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-800">E-mail</label>
                      <div className="relative">
                        <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-800">Senha</label>
                      <div className="relative">
                        <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button type="button" onClick={openForgot} className="text-sm text-slate-400 transition hover:text-slate-600">
                        Esqueci minha senha
                      </button>
                    </div>

                    {err ? <p className="-mt-2 text-sm text-rose-600">{err}</p> : null}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#223555] px-4 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(34,53,85,0.2)] transition hover:bg-[#1c2d49] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Entrando..." : "Entrar"}
                    </button>
                  </form>
                </div>

                <div className="-mt-1 rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-slate-900 bg-white px-4 py-2.5 text-base font-medium text-slate-800 transition hover:bg-slate-50"
                    >
                      Acesso Administrativo (Síndico)
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {view === "forgot" ? (
              <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <h1 className="text-2xl font-bold text-slate-900">Recuperar senha</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>

                <form onSubmit={onForgot} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">E-mail</label>
                    <div className="relative">
                      <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {forgotErr ? <p className="text-sm text-rose-600">{forgotErr}</p> : null}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full rounded-2xl bg-[#223555] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#1c2d49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="mt-5 w-full text-center text-sm text-slate-400 transition hover:text-slate-600"
                >
                  ← Voltar ao login
                </button>
              </div>
            ) : null}

            {view === "sent" ? (
              <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-6 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Mail size={24} />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-slate-900">Verifique seu e-mail</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">Enviamos um link de recuperação para</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{forgotEmail}</p>
                <p className="mt-4 text-xs text-slate-400">Não recebeu? Verifique a pasta de spam ou tente novamente.</p>
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setForgotErr("");
                  }}
                  className="mt-5 text-sm text-indigo-500 transition hover:underline"
                >
                  Reenviar e-mail
                </button>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="text-sm text-slate-400 transition hover:text-slate-600"
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
