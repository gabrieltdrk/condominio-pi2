import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase, getSupabaseAdmin } from "../../lib/supabase";
import { setStoredUser, type User, type UserRole } from "../../features/auth/services/auth";
import loginBg from "../../assets/login.jpg";

type Step = "loading" | "invalid" | "form" | "done";

export default function CompletarPerfil() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [userMeta, setUserMeta] = useState<Record<string, string | null>>({});

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUserId(session.user.id);
        setEmail(session.user.email ?? "");
        setUserMeta(session.user.user_metadata as Record<string, string | null>);
        setStep("form");
      } else if (event === "INITIAL_SESSION" && session) {
        setUserId(session.user.id);
        setEmail(session.user.email ?? "");
        setUserMeta(session.user.user_metadata as Record<string, string | null>);
        setStep("form");
      } else if (!session && step === "loading") {
        // Give a short grace period for Supabase to process the hash
        const timer = setTimeout(() => setStep("invalid"), 3000);
        return () => clearTimeout(timer);
      }
    });

    // Also check for an existing session immediately (hash already processed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserId(data.session.user.id);
        setEmail(data.session.user.email ?? "");
        setUserMeta(data.session.user.user_metadata as Record<string, string | null>);
        setStep("form");
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nome.trim()) {
      setErr("Nome completo é obrigatório.");
      return;
    }
    if (senha.length < 6) {
      setErr("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErr("As senhas não coincidem.");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      // Set the user's password
      const { error: pwErr } = await supabase.auth.updateUser({ password: senha });
      if (pwErr) throw new Error(pwErr.message);

      // Update the profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          name: nome.trim(),
          phone: telefone.trim() || null,
        })
        .eq("id", userId);
      if (profileErr) throw new Error(profileErr.message);

      // Vincular ao condomínio caso o invite tenha passado condominio_id nos metadados
      const condominioIdFromMeta = userMeta?.condominio_id ?? null;
      if (condominioIdFromMeta) {
        const admin = getSupabaseAdmin();
        const roleFromMeta = (userMeta?.role as string) ?? "MORADOR";
        await admin.from("usuario_condominio").upsert({
          user_id: userId,
          condominio_id: condominioIdFromMeta,
          active: true,
          role: roleFromMeta,
        } as never, { onConflict: "user_id,condominio_id" });
      }

      // Fetch the full profile to build the stored user
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role, phone, resident_type, status, avatar_url")
        .eq("id", userId)
        .single();

      const { data: ucRow } = await supabase
        .from("usuario_condominio")
        .select("condominio_id, role")
        .eq("user_id", userId)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      const { data: condData } = ucRow
        ? await supabase.from("condominios").select("name").eq("id", ucRow.condominio_id).single()
        : { data: null };

      const user: User = {
        id: userId,
        name: profile?.name ?? email,
        email,
        phone: profile?.phone ?? "",
        role: (profile?.role as UserRole) ?? "MORADOR",
        condominioId: null,
        condominioUUID: ucRow?.condominio_id ?? null,
        condominioName: (condData as any)?.name ?? undefined,
        residentType: profile?.resident_type ?? undefined,
        status: profile?.status ?? undefined,
        avatarUrl: profile?.avatar_url ?? undefined,
      };

      setStoredUser(user);
      setStep("done");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  }

  function maskPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

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
      <div className="w-full md:w-1/2 flex flex-col justify-between bg-white px-8 py-10 sm:px-16 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-indigo-600" />
          <span className="font-semibold text-sm text-gray-700">OmniLar</span>
        </div>

        <div className="w-full max-w-sm mx-auto py-8">
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
              <p className="text-sm text-gray-400">Verificando convite...</p>
            </div>
          )}

          {step === "invalid" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <svg
                  className="w-7 h-7 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
              <p className="text-sm text-gray-400 mb-8">
                Este link de convite é inválido ou expirou. Solicite um novo convite ao administrador.
              </p>
              <button
                type="button"
                onClick={() => nav("/login", { replace: true })}
                className="text-sm text-indigo-500 hover:underline"
              >
                ← Voltar ao login
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-5">
                <svg
                  className="w-7 h-7 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Perfil configurado!</h1>
              <p className="text-sm text-gray-400 mb-8">
                Bem-vindo ao sistema. Clique abaixo para acessar o painel.
              </p>
              <button
                type="button"
                onClick={() => nav("/dashboard", { replace: true })}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer"
              >
                Acessar o painel
              </button>
            </div>
          )}

          {step === "form" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Complete seu perfil</h1>
              <p className="text-sm text-gray-400 mb-8">
                Você foi convidado. Preencha seus dados para continuar.
              </p>

              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                {/* Nome */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nome completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className={inputCls}
                  />
                </div>

                {/* Telefone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className={inputCls}
                  />
                </div>

                {/* Senha */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Criar senha <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Confirmar senha <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmar ? "text" : "password"}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {err && <p className="text-xs text-red-500 -mt-2">{err}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition cursor-pointer"
                >
                  {loading ? "Salvando..." : "Salvar e acessar"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 text-right">
          © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
