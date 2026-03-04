import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { updatePassword } from "../services/auth";
import loginBg from "../assets/login.jpg";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase emite PASSWORD_RECOVERY quando o usuário chega pelo link de email
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setErr("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao atualizar a senha.");
    } finally {
      setLoading(false);
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

        <div className="w-full max-w-sm mx-auto">
          {done ? (
            // ── Sucesso ──
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Senha atualizada!</h1>
              <p className="text-sm text-gray-400 mb-8">Sua senha foi alterada com sucesso.</p>
              <button
                type="button"
                onClick={() => nav("/login", { replace: true })}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer"
              >
                Ir para o login
              </button>
            </div>
          ) : !ready ? (
            // ── Link inválido / expirado ──
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
              <p className="text-sm text-gray-400 mb-8">
                Este link de recuperação é inválido ou expirou. Solicite um novo.
              </p>
              <button
                type="button"
                onClick={() => nav("/login", { replace: true })}
                className="text-sm text-indigo-500 hover:underline"
              >
                ← Voltar ao login
              </button>
            </div>
          ) : (
            // ── Formulário de nova senha ──
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Nova senha</h1>
              <p className="text-sm text-gray-400 mb-8">Digite sua nova senha abaixo.</p>

              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {err && <p className="text-xs text-red-500 -mt-2">{err}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer"
                >
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </button>
              </form>
            </>
          )}
        </div>

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
