import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../services/auth";
import loginBg from "../assets/login.jpg";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex h-screen w-screen">
      {/* Left — image panel */}
      <div className="hidden md:block md:w-1/2 relative">
        <img
          src={loginBg}
          alt="Login background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Right — form panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-between bg-white px-8 py-10 sm:px-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600" />
          <span className="font-semibold text-sm text-gray-700">Condomínio</span>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Faça login para acessar o sistema
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Login
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@condominio.com"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
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

            {/* Error */}
            {err && (
              <p className="text-xs text-red-500 -mt-2">{err}</p>
            )}

            {/* Sign in */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600" />
            <span>Sistema do Condomínio</span>
          </div>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
