import { X } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function ModalShell({ title, subtitle, onClose, children }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-35px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="m-0 text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}
