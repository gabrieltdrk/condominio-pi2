import QRCode from "npm:qrcode";
import { fetchRequest, getClients, hashToken } from "../_shared/visitors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function page(title: string, body: string) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim() ?? "";
    const wantsJson = url.searchParams.get("format") === "json" || req.headers.get("accept")?.includes("application/json");

    if (!token) {
      if (wantsJson) {
        return json({ error: "O link recebido esta incompleto. Solicite um novo e-mail de acesso." }, 400);
      }

      return html(
        page(
          "QR code indisponivel",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">QR code indisponivel</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">O link recebido esta incompleto. Solicite um novo e-mail de acesso.</p>
          `,
        ),
        400,
      );
    }

    const { adminClient } = getClients(new Request(req.url, { headers: req.headers }));
    const tokenHash = await hashToken(token);
    const { data: accessToken, error: tokenError } = await adminClient
      .from("visitor_tokens")
      .select("request_id, used_at, expires_at")
      .eq("token_hash", tokenHash)
      .eq("token_type", "ACCESS")
      .single();

    if (tokenError || !accessToken) {
      if (wantsJson) {
        return json({ error: "O token informado e invalido." }, 404);
      }

      return html(
        page(
          "QR code indisponivel",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Nao foi possivel abrir este QR code</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">O token informado e invalido.</p>
          `,
        ),
        404,
      );
    }

    if (accessToken.used_at) {
      if (wantsJson) {
        return json({ error: "Este QR code ja foi utilizado." }, 400);
      }

      return html(
        page(
          "QR code utilizado",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Este QR code ja foi utilizado</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">Solicite um novo cadastro caso precise entrar novamente.</p>
          `,
        ),
        400,
      );
    }

    if (new Date(accessToken.expires_at).getTime() < Date.now()) {
      if (wantsJson) {
        return json({ error: "Este QR code expirou." }, 400);
      }

      return html(
        page(
          "QR code expirado",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Este QR code expirou</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">Peca ao morador responsavel para reenviar a visita.</p>
          `,
        ),
        400,
      );
    }

    const { request } = await fetchRequest(adminClient, accessToken.request_id);
    if (request.status === "CANCELADO") {
      if (wantsJson) {
        return json({ error: "Esta visita foi cancelada." }, 400);
      }

      return html(
        page(
          "Visita cancelada",
          `
            <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
            <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Esta visita foi cancelada</h1>
            <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">Peca ao morador responsavel para cadastrar uma nova visita.</p>
          `,
        ),
        400,
      );
    }

    const qrDataUrl = await QRCode.toDataURL(`omni-visit:${token}`, { margin: 1, width: 320 });
    const payload = {
      qrDataUrl,
      manualCode: `omni-visit:${token}`,
      expectedCheckIn: request.expected_check_in,
      expectedCheckOut: request.expected_check_out,
    };

    if (wantsJson) {
      return json(payload);
    }

    return html(
      page(
        "QR code da visita",
        `
          <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
          <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Seu QR code esta pronto</h1>
          <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">Apresente este QR code no horario da sua visita.</p>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
            Check-in previsto: ${new Date(request.expected_check_in).toLocaleString("pt-BR")}<br />
            Check-out previsto: ${new Date(request.expected_check_out).toLocaleString("pt-BR")}
          </p>
          <div style="margin:28px 0 0;padding:20px;border:1px solid #e2e8f0;border-radius:24px;background:#f8fafc;text-align:center;">
            <img src="${qrDataUrl}" alt="QR code da visita" style="width:280px;max-width:100%;height:auto;" />
          </div>
          <p style="margin:18px 0 0;font-size:12px;color:#64748b;word-break:break-word;">Codigo manual: omni-visit:${token}</p>
        `,
      ),
    );
  } catch (error) {
    if (new URL(req.url).searchParams.get("format") === "json" || req.headers.get("accept")?.includes("application/json")) {
      return json({ error: error instanceof Error ? error.message : "Solicite um novo e-mail de acesso." }, 400);
    }

    return html(
      page(
        "QR code indisponivel",
        `
          <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Fluxo de visitantes</p>
          <h1 style="margin:16px 0 0;font-size:28px;line-height:1.1;">Nao foi possivel abrir este QR code</h1>
          <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#475569;">${error instanceof Error ? error.message : "Solicite um novo e-mail de acesso."}</p>
        `,
      ),
      400,
    );
  }
});
