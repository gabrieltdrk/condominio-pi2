import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../services/auth";

export default function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const nav = useNavigate();
  const user = getUser();

  function sair() {
    logout();
    nav("/login");
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>{title}</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              Logado como: <b>{user?.name}</b> ({user?.role})
            </p>
          </div>

          <button className="button" onClick={sair} style={{ width: "auto", paddingInline: 16 }}>
            Sair
          </button>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />

        {children}
      </div>
    </div>
  );
}