import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import "../styles/pages/login.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Erro no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-center">
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, textAlign: "center", fontWeight: 600 }}>
          Sistema do Condomínio
        </h2>

        <label className="label">Email</label>
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="admin@condominio.com"
        />

        <label className="label">Senha</label>
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          placeholder="••••••••"
        />

        {err && <p className="error">{err}</p>}

        <button className="button" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="helper" style={{ marginTop: 6 }}>
          <div><b>Admin:</b> admin@condominio.com / 123456</div>
          <div><b>Morador:</b> morador@condominio.com / 123456</div>
        </div>
      </form>
    </div>
  );
}