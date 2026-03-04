import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login, loginWithGoogle, checkOAuthSession, resetPassword } from "../services/auth";
import loginBg from "../assets/login.jpg";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

type View = "login" | "forgot" | "sent";

export default function Login() {
  const nav = useNavigate();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErr, setForgotErr] = useState("");

  // Detecta sessão OAuth após redirect do Google
  useEffect(() => {
    checkOAuthSession().then((user) => {
      if (user) nav("/dashboard", { replace: true });
    });
  }, [nav]);

  function openForgot() {
    setForgotEmail(email); // pré-preenche com email digitado
    setForgotErr("");
    setView("forgot");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro no login.");
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
    } catch (e: unknown) {
      setForgotErr(e instanceof Error ? e.message : "Erro ao enviar email.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function onGoogle() {
    setSocialLoading(true);
    setErr("");
    try {
      await loginWithGoogle();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao conectar com Google.");
      setSocialLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

  return (
    <div className="flex h-screen w-screen">
      {/* Left — image panel */}
      <div className="hidden md:block md:w-1/2 relative">
        <img src={loginBg} alt="Login background" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Right — form panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-between bg-white px-8 py-10 sm:px-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-indigo-600" />
          <span className="font-semibold text-sm text-gray-700">Condomínio</span>
        </div>

        {/* ── VIEW: login ── */}
        {view === "login" && (
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
            <p className="text-sm text-gray-400 mb-8">Faça login para acessar o sistema</p>

            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Login</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@condominio.com" required className={inputCls} />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Senha</label>
                  <button type="button" onClick={openForgot} className="text-xs text-indigo-500 hover:underline">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" required className={`${inputCls} pr-11`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {err && <p className="text-xs text-red-500 -mt-2">{err}</p>}

              <button type="submit" disabled={loading || socialLoading} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer">
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {/* Separator */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 whitespace-nowrap">ou faça login com</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social buttons */}
            <div className="flex gap-3">
              <button type="button" onClick={onGoogle} disabled={loading || socialLoading} className="flex-1 flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60 transition cursor-pointer">
                <GoogleIcon />
                Google
              </button>
              <button type="button" disabled title="Em breve" className="flex-1 flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed opacity-50">
                <FacebookIcon />
                Facebook
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: forgot ── */}
        {view === "forgot" && (
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Recuperar senha</h1>
            <p className="text-sm text-gray-400 mb-8">
              Informe seu email e enviaremos um link para criar uma nova senha.
            </p>

            <form onSubmit={onForgot} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="email@condominio.com" required className={inputCls} />
              </div>

              {forgotErr && <p className="text-xs text-red-500 -mt-2">{forgotErr}</p>}

              <button type="submit" disabled={forgotLoading} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer">
                {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>

            <button type="button" onClick={() => setView("login")} className="mt-5 text-sm text-gray-400 hover:text-gray-600 w-full text-center">
              ← Voltar ao login
            </button>
          </div>
        )}

        {/* ── VIEW: sent ── */}
        {view === "sent" && (
          <div className="w-full max-w-sm mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu email</h1>
            <p className="text-sm text-gray-400 mb-1">
              Enviamos um link de recuperação para
            </p>
            <p className="text-sm font-semibold text-gray-700 mb-8">{forgotEmail}</p>
            <p className="text-xs text-gray-400 mb-6">
              Não recebeu? Verifique a pasta de spam ou tente novamente.
            </p>
            <button type="button" onClick={() => { setView("forgot"); setForgotErr(""); }} className="text-sm text-indigo-500 hover:underline">
              Reenviar email
            </button>
            <div className="mt-4">
              <button type="button" onClick={() => setView("login")} className="text-sm text-gray-400 hover:text-gray-600">
                ← Voltar ao login
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-linear-to-br from-violet-500 to-indigo-600" />
            <span>Sistema do Condomínio</span>
          </div>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
