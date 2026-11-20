import { useState, useCallback } from "react";

type ModalState<T> = {
  isOpen: boolean;
  item: T | null;
  open: (item?: T) => void;
  close: () => void;
};

/**
 * Hook genérico para gerenciar estado de modal (abertura, fechamento e item em edição).
 * Elimina o padrão `const [open, setOpen] = useState(false); const [item, setItem] = useState(null)`
 * repetido em 12+ pages.
 *
 * @example
 * const createModal = useModal<User>();
 * const editModal = useModal<User>();
 *
 * editModal.open(user);   // abre com item
 * editModal.close();      // fecha e limpa
 * editModal.item          // User | null
 */
export function useModal<T = undefined>(): ModalState<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<T | null>(null);

  const open = useCallback((newItem?: T) => {
    setItem(newItem ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  return { isOpen, item, open, close };
}
