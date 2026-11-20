import type { Poll } from "../../../features/enquetes/services/enquetes";
import {
  getAssemblyTypeLabel,
  getModeLabel,
  getScopeLabel,
  getStatusMeta,
  getPollTotalVotes,
  getWinningOption,
} from "./poll-calc";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDateDocument(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildMinutesDocument(poll: Poll) {
  const totalVotes = getPollTotalVotes(poll);
  const winner = getWinningOption(poll);
  const resultItems = poll.options
    .map((option) => {
      const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
      return `<li><strong>${escapeHtml(option.text)}</strong>: ${option.votes.length} voto(s) (${percentage}%)</li>`;
    })
    .join("");

  const commentItems =
    poll.comments.length > 0
      ? poll.comments
          .map(
            (comment) =>
              `<li><strong>${escapeHtml(comment.author)}</strong> (${formatDateDocument(comment.createdAt)}): ${escapeHtml(comment.message)}</li>`,
          )
          .join("")
      : "<li>Sem manifestacoes registradas.</li>";

  const minutesSummary = poll.minutesSummary.trim()
    ? escapeHtml(poll.minutesSummary).replaceAll("\n", "<br />")
    : "Ata resumida ainda nao informada.";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Ata da Assembleia - ${escapeHtml(poll.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; line-height: 1.6; }
      h1, h2, h3, p { margin: 0 0 12px; }
      h1 { font-size: 24px; }
      h2 { margin-top: 24px; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 20px 0; }
      .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px; background: #f8fafc; }
      .muted { color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
      ul { padding-left: 20px; }
      .footer { margin-top: 40px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
      .signature { padding-top: 28px; border-top: 1px solid #94a3b8; }
      @media print { body { margin: 18px; } }
    </style>
  </head>
  <body>
    <h1>Ata de Assembleia Digital</h1>
    <p><strong>Pauta:</strong> ${escapeHtml(poll.title)}</p>
    <p><strong>Descricao:</strong> ${escapeHtml(poll.description || "Sem descricao adicional.")}</p>

    ${
      poll.attachmentUrl
        ? `<p><strong>Anexo da pauta:</strong> <a href="${poll.attachmentUrl}" target="_blank" rel="noreferrer">${escapeHtml(
            poll.attachmentName ?? "Documento",
          )}</a></p>`
        : ""
    }

    <div class="meta">
      <div class="card"><div class="muted">Tipo</div><div>${escapeHtml(getAssemblyTypeLabel(poll.assemblyType))}</div></div>
      <div class="card"><div class="muted">Modalidade</div><div>${escapeHtml(getModeLabel(poll.meetingMode))}</div></div>
      <div class="card"><div class="muted">Escopo</div><div>${escapeHtml(getScopeLabel(poll.scope))}</div></div>
      <div class="card"><div class="muted">Status</div><div>${escapeHtml(getStatusMeta(poll.status).label)}</div></div>
      <div class="card"><div class="muted">Convocada por</div><div>${escapeHtml(poll.createdBy)}</div></div>
      <div class="card"><div class="muted">Criada em</div><div>${formatDateDocument(poll.createdAt)}</div></div>
      <div class="card"><div class="muted">Janela de votacao</div><div>${formatDateDocument(poll.votingStartsAt)} ate ${formatDateDocument(poll.votingEndsAt)}</div></div>
      <div class="card"><div class="muted">Data da reuniao</div><div>${formatDateDocument(poll.meetingAt)}</div></div>
      <div class="card"><div class="muted">Quorum minimo</div><div>${poll.quorumMinPercent}%</div></div>
      <div class="card"><div class="muted">Aprovacao minima</div><div>${poll.approvalMinPercent}%</div></div>
    </div>

    <h2>Resultado da Deliberacao</h2>
    <p><strong>Total de votos:</strong> ${totalVotes}</p>
    <p><strong>Opcao lider:</strong> ${escapeHtml(winner?.text ?? "Sem definicao")}</p>
    <ul>${resultItems}</ul>

    <h2>Manifestacoes Registradas</h2>
    <ul>${commentItems}</ul>

    <h2>Ata Resumida</h2>
    <p>${minutesSummary}</p>

    <div class="footer">
      <div class="signature">
        Responsavel pela assembleia
        ${
          poll.creatorSignatureUrl
            ? `<div style="margin-top:12px;"><img src="${poll.creatorSignatureUrl}" alt="Assinatura" style="max-height:80px;"></div>`
            : ""
        }
        <div style="margin-top:6px; color:#475569; font-size:12px;">${escapeHtml(poll.creatorSignatureName ?? poll.createdBy)}</div>
      </div>
      <div class="signature">Representacao do condominio</div>
    </div>
  </body>
</html>`;
}
