import {
  apartmentLabel,
  createQrDataUrl,
  createServiceClient,
  fetchVisitorBundle,
  findToken,
  formatDateTime,
} from "../_shared/visitor-flow.ts";

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function renderPage(title: string, body: string) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
          <section style="width:100%;max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:28px;padding:28px;box-shadow:0 30px 80px -45px rgba(15,23,42,0.45);">
            ${body}
          </section>
        </main>
      </body>
    </html>
  `;
}

Deno.serve(async (request) => {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (!token) {
      return htmlResponse(
        renderPage(
          "QR code indisponível",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">QR code indisponível</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">O link recebido está incompleto. Solicite um novo e-mail de acesso.</p>
          `,
        ),
        400,
      );
    }

    const admin = createServiceClient();
    const accessToken = await findToken(admin, token, "ACCESS");
    const bundle = await fetchVisitorBundle(admin, accessToken.request_id);

    if (bundle.request.status === "CANCELADO") {
      return htmlResponse(
        renderPage(
          "Visita cancelada",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Esta visita foi cancelada</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">Peça ao morador responsável para cadastrar uma nova visita.</p>
          `,
        ),
        400,
      );
    }

    const qrDataUrl = await createQrDataUrl(token);
    return htmlResponse(
      renderPage(
        "QR code da visita",
        `
          <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
          <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Seu QR code está pronto</h1>
          <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">
            Apresente este QR code em <strong>${apartmentLabel(bundle.apartment)}</strong>.
          </p>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
            Entrada prevista: ${formatDateTime(bundle.request.expected_check_in)}<br />
            Saída prevista: ${formatDateTime(bundle.request.expected_check_out)}
          </p>
          <div style="margin:28px 0 0;padding:20px;border:1px solid #e2e8f0;border-radius:24px;background:#f8fafc;text-align:center;">
            <img src="${qrDataUrl}" alt="QR code da visita" style="width:280px;max-width:100%;height:auto;" />
          </div>
          <p style="margin:18px 0 0;font-size:12px;color:#64748b;word-break:break-word;">Código manual: omni-visit:${token}</p>
        `,
      ),
    );
  } catch (error) {
    return htmlResponse(
      renderPage(
        "QR code indisponível",
        `
          <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
          <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Não foi possível abrir este QR code</h1>
          <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">${error instanceof Error ? error.message : "Solicite um novo e-mail de acesso."}</p>
        `,
      ),
      400,
    );
  }
});
