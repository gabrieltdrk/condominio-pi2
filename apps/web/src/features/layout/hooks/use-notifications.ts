import { useCallback, useEffect, useRef, useState } from "react";
import { listNotificacoes, marcarNotificacaoLida, marcarTodasLidas, type Notificacao } from "../../avisos/services/avisos";

export function useNotifications() {
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellPos, setBellPos] = useState({ top: 0, left: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const unread = notifs.filter((n) => !n.lida).length;

  const loadNotifs = useCallback(() => {
    listNotificacoes().then(setNotifs).catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  function openBell() {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setBellPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 336) });
    }
    setBellOpen((v) => !v);
  }

  function handleMarcarLida(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    marcarNotificacaoLida(id).catch(() => {});
  }

  function handleMarcarTodas() {
    setNotifs([]);
    marcarTodasLidas().catch(() => {});
  }

  return { notifs, bellOpen, setBellOpen, bellPos, bellRef, unread, openBell, handleMarcarLida, handleMarcarTodas };
}
