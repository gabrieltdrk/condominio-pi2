import type { FinanceBill } from "../../../features/financeiro/services/financeiro";
import { formatCurrency, formatDate, type AccountabilityReport } from "./finance-calc";

export function buildPixCode(bill: FinanceBill) {
  return `PIX|OMNILAR|${bill.bill_code}|${bill.amount.toFixed(2)}|${bill.due_date}`;
}

export function openBillPrintView(bill: FinanceBill) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${bill.bill_code}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .card { border: 1px solid #cbd5e1; border-radius: 20px; padding: 24px; }
          .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; }
          .line { font-family: monospace; font-size: 20px; letter-spacing: 1px; margin: 18px 0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="pill">Boleto mockado</div>
          <h1>${bill.bill_code}</h1>
          <p>Documento interno para cobranca condominial sem integracao bancaria.</p>
          <div class="line">${bill.digitable_line}</div>
          <div class="grid">
            <div><div class="label">Unidade</div><div class="value">${bill.unit}</div></div>
            <div><div class="label">Morador</div><div class="value">${bill.resident}</div></div>
            <div><div class="label">Competencia</div><div class="value">${formatDate(bill.competence_date)}</div></div>
            <div><div class="label">Vencimento</div><div class="value">${formatDate(bill.due_date)}</div></div>
            <div><div class="label">Valor</div><div class="value">${formatCurrency(bill.amount)}</div></div>
            <div><div class="label">Codigo de barras</div><div class="value">${bill.barcode}</div></div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Gerado para demonstracao do fluxo financeiro do condominio.</p>
        </div>
        <script>window.print()</script>
      </body>
    </html>`);
  win.document.close();
}

export function openReceiptPrintView(bill: FinanceBill) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Recibo ${bill.bill_code}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .card { border: 1px solid #cbd5e1; border-radius: 20px; padding: 24px; }
          .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #ecfdf5; border: 1px solid #bbf7d0; font-size: 12px; font-weight: bold; color: #047857; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="pill">Recibo de quitacao</div>
          <h1>${bill.bill_code}</h1>
          <p>Comprovante interno de pagamento da taxa condominial.</p>
          <div class="grid">
            <div><div class="label">Unidade</div><div class="value">${bill.unit}</div></div>
            <div><div class="label">Morador</div><div class="value">${bill.resident}</div></div>
            <div><div class="label">Competencia</div><div class="value">${formatDate(bill.competence_date)}</div></div>
            <div><div class="label">Vencimento</div><div class="value">${formatDate(bill.due_date)}</div></div>
            <div><div class="label">Valor pago</div><div class="value">${formatCurrency(bill.amount)}</div></div>
            <div><div class="label">Baixa</div><div class="value">${bill.paid_at ? formatDate(bill.paid_at) : "Aguardando compensacao"}</div></div>
          </div>
        </div>
        <script>window.print()</script>
      </body>
    </html>`);
  win.document.close();
}

export function openAccountabilityPrintView(report: AccountabilityReport) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const highlightLines = report.highlights
    .map((item) => `<li>${item.description} - ${formatCurrency(item.amount)}</li>`)
    .join("");
  win.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Balancete ${report.label}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .card { border: 1px solid #cbd5e1; border-radius: 20px; padding: 24px; }
          .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef2ff; border: 1px solid #c7d2fe; font-size: 12px; font-weight: bold; color: #4338ca; }
          .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: bold; }
          ul { margin-top: 20px; padding-left: 20px; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="pill">Prestacao de contas</div>
          <h1>${report.label}</h1>
          <p>Resumo financeiro agregado do condominio para consulta dos moradores.</p>
          <div class="grid">
            <div><div class="label">Receitas</div><div class="value">${formatCurrency(report.receitas)}</div></div>
            <div><div class="label">Despesas</div><div class="value">${formatCurrency(report.despesas)}</div></div>
            <div><div class="label">Saldo</div><div class="value">${formatCurrency(report.saldo)}</div></div>
          </div>
          <h2 style="margin-top: 24px;">Principais despesas</h2>
          <ul>${highlightLines || "<li>Sem despesas registradas no periodo.</li>"}</ul>
        </div>
        <script>window.print()</script>
      </body>
    </html>`);
  win.document.close();
}

export function openInvoicesPrintView(report: AccountabilityReport) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const blocks = report.highlights
    .map(
      (item) => `
        <div class="invoice">
          <div class="label">Fornecedor / descricao</div>
          <div class="value">${item.description}</div>
          <div class="label" style="margin-top: 12px;">Categoria</div>
          <div class="value">${item.category}</div>
          <div class="label" style="margin-top: 12px;">Valor</div>
          <div class="value">${formatCurrency(item.amount)}</div>
          <div class="label" style="margin-top: 12px;">Documento</div>
          <div class="value">${item.document_name ?? "NF digitalizada pendente"}</div>
        </div>`,
    )
    .join("");
  win.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Notas ${report.label}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .invoice { border: 1px solid #cbd5e1; border-radius: 20px; padding: 20px; margin-bottom: 16px; }
          .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 12px; font-weight: bold; color: #1d4ed8; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="pill">Notas fiscais principais</div>
        <h1>${report.label}</h1>
        <p>Consulta agregada das maiores despesas do periodo para transparencia do condominio.</p>
        ${blocks || "<div class='invoice'><div class='value'>Nenhuma nota principal registrada no periodo.</div></div>"}
        <script>window.print()</script>
      </body>
    </html>`);
  win.document.close();
}
