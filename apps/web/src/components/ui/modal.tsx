import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  children: ReactNode;
  /** Altura máxima customizada — ex: "max-h-[88vh]". Padrão: sem restrição. */
  maxHeightClass?: string;
};

/**
 * Modal base compartilhado.
 * Substitui as 4+ implementações inline de modal shell nas pages.
 */
export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
  maxHeightClass,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`flex flex-col w-full ${SIZE_CLASSES[size]} ${maxHeightClass ?? ""} bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
