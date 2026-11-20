import { useEffect, useRef, useState } from "react";

export function SignaturePad({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const scaleRef = useRef(1);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!value || !canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const logicalWidth = canvasEl.width / scaleRef.current;
    const logicalHeight = canvasEl.height / scaleRef.current;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
    };
    img.src = value;
  }, [value, canvasEl]);

  useEffect(() => {
    if (!canvasEl || initializedRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    scaleRef.current = dpr;
    const logicalWidth = canvasEl.getBoundingClientRect().width || 600;
    const logicalHeight = 200;
    canvasEl.width = logicalWidth * dpr;
    canvasEl.height = logicalHeight * dpr;
    const ctx = canvasEl.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }
    initializedRef.current = true;
  }, [canvasEl]);

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    if (!canvasEl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvasEl.getBoundingClientRect();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    setIsDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    if (!isDrawing || !canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const rect = canvasEl.getBoundingClientRect();
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    if (!isDrawing || !canvasEl) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
    onChange(canvasEl.toDataURL("image/png"));
  }

  function clearCanvas() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const logicalWidth = canvasEl.width / scaleRef.current;
    const logicalHeight = canvasEl.height / scaleRef.current;
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    onChange("");
  }

  return (
    <div className="mt-2">
      <canvas
        ref={setCanvasEl}
        width={600}
        height={200}
        className="w-full touch-none select-none rounded-2xl border border-slate-300 bg-white"
        style={{ touchAction: "none" }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <div className="mt-2 flex items-center gap-2">
        <p className="text-[11px] text-slate-500 flex-1">Assine com mouse ou toque. A imagem é salva como PNG para a ata.</p>
        <button type="button" onClick={clearCanvas} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          Limpar assinatura
        </button>
      </div>
    </div>
  );
}
