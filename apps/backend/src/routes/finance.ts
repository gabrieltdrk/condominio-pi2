import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

type FinanceEntryType = "REVENUE" | "EXPENSE";
type FinanceBillStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

type FinanceEntryRow = {
  id: number;
  type: FinanceEntryType;
  identifier: string;
  description: string;
  amount: string | number;
  reference_date: string;
  due_date: string | null;
  counterparty: string;
  unit: string | null;
  resident: string | null;
  category: string;
  payment_method: string;
  status: string;
  document_name: string | null;
  notes: string | null;
  created_at: string;
};

type FinanceBillRow = {
  id: number;
  entry_id: number;
  bill_code: string;
  unit: string;
  resident: string;
  resident_email: string | null;
  competence_date: string;
  issue_date: string;
  due_date: string;
  amount: string | number;
  instructions: string | null;
  status: FinanceBillStatus;
  digitable_line: string;
  barcode: string;
  pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreateFinanceEntryBody = {
  type: FinanceEntryType;
  identifier: string;
  description: string;
  amount: number;
  referenceDate: string;
  dueDate?: string | null;
  counterparty: string;
  unit?: string | null;
  resident?: string | null;
  category: string;
  paymentMethod: string;
  status: string;
  documentName?: string | null;
  notes?: string | null;
};

type CreateFinanceBillBody = {
  unit: string;
  resident: string;
  residentEmail?: string | null;
  amount: number;
  competenceDate: string;
  dueDate: string;
  issueDate?: string | null;
  instructions?: string | null;
};

type FinanceBillsQuerystring = {
  resident?: string;
  residentEmail?: string;
  unit?: string;
  status?: FinanceBillStatus;
  limit?: string;
};

type UpdateFinanceBillStatusBody = {
  status: FinanceBillStatus;
  paidAt?: string | null;
};

function mapFinanceEntry(row: FinanceEntryRow) {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

function mapFinanceBill(row: FinanceBillRow) {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

function pad(value: number | string, length: number) {
  return String(value).padStart(length, "0");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCompetence(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${pad(month, 2)}/${year}`;
}

function toDateOnly(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function mapBillStatusToEntryStatus(status: FinanceBillStatus) {
  switch (status) {
    case "PAID":
      return "Recebido";
    case "OVERDUE":
      return "Atrasado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Em aberto";
  }
}

function buildBarcode(seed: number, amount: number, dueDate: string) {
  const amountDigits = pad(Math.round(amount * 100), 10);
  const dueDigits = onlyDigits(dueDate).slice(-8);
  const sequence = pad(seed, 14);
  const freeField = `${sequence}${dueDigits}${amountDigits}`.slice(0, 25);
  return `3419${dueDigits}${amountDigits}${freeField}`.slice(0, 44);
}

function buildDigitableLine(seed: number, amount: number, dueDate: string) {
  const barcode = buildBarcode(seed, amount, dueDate);
  return `${barcode.slice(0, 5)}.${barcode.slice(5, 10)} ${barcode.slice(10, 15)}.${barcode.slice(15, 21)} ${barcode.slice(21, 26)}.${barcode.slice(26, 32)} ${barcode.slice(32, 33)} ${barcode.slice(33, 47)}`.trim();
}

function buildBillCode(seed: number, competenceDate: string) {
  const competence = competenceDate.slice(0, 7).replace("-", "");
  return `BOL-${competence}-${pad(seed, 4)}`;
}

function buildEntryIdentifier(seed: number, competenceDate: string) {
  const competence = competenceDate.slice(0, 7).replace("-", "");
  return `REC-${competence}-${pad(seed, 4)}`;
}

export async function financeRoutes(app: FastifyInstance) {
  app.get("/finance/entries", { preHandler: requireAuth }, async (request) => {
    const condominioId = request.user.condominioId;

    const result = await db.query<FinanceEntryRow>(
      `SELECT
        id, type, identifier, description, amount,
        reference_date, due_date, counterparty, unit, resident,
        category, payment_method, status, document_name, notes, created_at
      FROM finance_entries
      WHERE condominio_id = $1
      ORDER BY reference_date DESC, created_at DESC`,
      [condominioId],
    );

    return result.rows.map(mapFinanceEntry);
  });

  app.post<{ Body: CreateFinanceEntryBody }>(
    "/finance/entries",
    {
      schema: {
        body: {
          type: "object",
          required: ["type", "identifier", "description", "amount", "referenceDate", "counterparty", "category", "paymentMethod", "status"],
          properties: {
            type: { type: "string", enum: ["REVENUE", "EXPENSE"] },
            identifier: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            amount: { type: "number", minimum: 0 },
            referenceDate: { type: "string", format: "date" },
            dueDate: { type: ["string", "null"], format: "date" },
            counterparty: { type: "string", minLength: 1 },
            unit: { type: ["string", "null"] },
            resident: { type: ["string", "null"] },
            category: { type: "string", minLength: 1 },
            paymentMethod: { type: "string", minLength: 1 },
            status: { type: "string", minLength: 1 },
            documentName: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
          },
        },
      },
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const body = request.body;
      const condominioId = request.user.condominioId;

      const result = await db.query<FinanceEntryRow>(
        `INSERT INTO finance_entries (
          condominio_id, type, identifier, description, amount,
          reference_date, due_date, counterparty, unit, resident,
          category, payment_method, status, document_name, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING
          id, type, identifier, description, amount,
          reference_date, due_date, counterparty, unit, resident,
          category, payment_method, status, document_name, notes, created_at`,
        [
          condominioId,
          body.type, body.identifier, body.description, body.amount,
          body.referenceDate, body.dueDate ?? null,
          body.counterparty, body.unit ?? null, body.resident ?? null,
          body.category, body.paymentMethod, body.status,
          body.documentName ?? null, body.notes ?? null,
        ],
      );

      return reply.status(201).send(mapFinanceEntry(result.rows[0]));
    },
  );

  app.get<{ Querystring: FinanceBillsQuerystring }>(
    "/finance/bills",
    { preHandler: requireAuth },
    async (request) => {
      const filters = request.query;
      const condominioId = request.user.condominioId;

      const values: Array<string | number> = [condominioId as number];
      const conditions: string[] = ["condominio_id = $1"];

      if (filters.resident) {
        values.push(`%${filters.resident}%`);
        conditions.push(`resident ILIKE $${values.length}`);
      }
      if (filters.residentEmail) {
        values.push(filters.residentEmail);
        conditions.push(`resident_email = $${values.length}`);
      }
      if (filters.unit) {
        values.push(`%${filters.unit}%`);
        conditions.push(`unit ILIKE $${values.length}`);
      }
      if (filters.status) {
        values.push(filters.status);
        conditions.push(`status = $${values.length}`);
      }

      const limit = Number(filters.limit ?? 50);
      values.push(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50);

      const result = await db.query<FinanceBillRow>(
        `SELECT
          id, entry_id, bill_code, unit, resident, resident_email,
          competence_date, issue_date, due_date, amount, instructions, status,
          digitable_line, barcode, pdf_url, paid_at, created_at, updated_at
        FROM finance_bills
        WHERE ${conditions.join(" AND ")}
        ORDER BY due_date ASC, created_at DESC
        LIMIT $${values.length}`,
        values,
      );

      return result.rows.map(mapFinanceBill);
    },
  );

  app.post<{ Body: CreateFinanceBillBody }>(
    "/finance/bills",
    {
      schema: {
        body: {
          type: "object",
          required: ["unit", "resident", "amount", "competenceDate", "dueDate"],
          properties: {
            unit: { type: "string", minLength: 1 },
            resident: { type: "string", minLength: 1 },
            residentEmail: { type: ["string", "null"], format: "email" },
            amount: { type: "number", minimum: 0.01 },
            competenceDate: { type: "string", format: "date" },
            dueDate: { type: "string", format: "date" },
            issueDate: { type: ["string", "null"], format: "date" },
            instructions: { type: ["string", "null"] },
          },
        },
      },
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const client = await db.connect();
      const body = request.body;
      const condominioId = request.user.condominioId;
      const issueDate = toDateOnly(body.issueDate);

      try {
        await client.query("BEGIN");

        const sequenceResult = await client.query<{ next_id: number }>(
          "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM finance_bills WHERE condominio_id = $1",
          [condominioId],
        );

        const seed = sequenceResult.rows[0]?.next_id ?? 1;
        const billCode = buildBillCode(seed, body.competenceDate);
        const entryIdentifier = buildEntryIdentifier(seed, body.competenceDate);
        const digitableLine = buildDigitableLine(seed, body.amount, body.dueDate);
        const barcode = buildBarcode(seed, body.amount, body.dueDate);
        const description = `Taxa condominial ${formatCompetence(body.competenceDate)} - ${body.unit}`;

        const entryResult = await client.query<FinanceEntryRow>(
          `INSERT INTO finance_entries (
            condominio_id, type, identifier, description, amount,
            reference_date, due_date, counterparty, unit, resident,
            category, payment_method, status, document_name, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING
            id, type, identifier, description, amount,
            reference_date, due_date, counterparty, unit, resident,
            category, payment_method, status, document_name, notes, created_at`,
          [
            condominioId,
            "REVENUE", entryIdentifier, description, body.amount,
            issueDate, body.dueDate, body.resident, body.unit, body.resident,
            "Taxa condominial", "Boleto", "Em aberto",
            `${billCode}.pdf`, body.instructions ?? null,
          ],
        );

        const entry = entryResult.rows[0];

        const billResult = await client.query<FinanceBillRow>(
          `INSERT INTO finance_bills (
            condominio_id, entry_id, bill_code, unit, resident, resident_email,
            competence_date, issue_date, due_date, amount, instructions,
            status, digitable_line, barcode, pdf_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, $13, $14)
          RETURNING
            id, entry_id, bill_code, unit, resident, resident_email,
            competence_date, issue_date, due_date, amount, instructions, status,
            digitable_line, barcode, pdf_url, paid_at, created_at, updated_at`,
          [
            condominioId,
            entry.id, billCode, body.unit, body.resident, body.residentEmail ?? null,
            body.competenceDate, issueDate, body.dueDate, body.amount,
            body.instructions ?? null, digitableLine, barcode,
            `/finance/bills/${billCode}/mock-pdf`,
          ],
        );

        await client.query("COMMIT");
        return reply.status(201).send(mapFinanceBill(billResult.rows[0]));
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateFinanceBillStatusBody }>(
    "/finance/bills/:id/status",
    {
      schema: {
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["PENDING", "PAID", "OVERDUE", "CANCELLED"] },
            paidAt: { type: ["string", "null"], format: "date-time" },
          },
        },
      },
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const client = await db.connect();
      const billId = Number(request.params.id);
      const condominioId = request.user.condominioId;
      const { status, paidAt } = request.body;

      try {
        await client.query("BEGIN");

        const billResult = await client.query<FinanceBillRow>(
          `UPDATE finance_bills
          SET
            status = $1,
            paid_at = CASE WHEN $1 = 'PAID' THEN COALESCE($2, NOW()::text)::timestamptz ELSE NULL END,
            updated_at = NOW()
          WHERE id = $3 AND condominio_id = $4
          RETURNING
            id,
            entry_id,
            bill_code,
            unit,
            resident,
            resident_email,
            competence_date,
            issue_date,
            due_date,
            amount,
            instructions,
            status,
            digitable_line,
            barcode,
            pdf_url,
            paid_at,
            created_at,
            updated_at`,
          [status, paidAt ?? null, billId, condominioId],
        );

        const bill = billResult.rows[0];
        if (!bill) {
          await client.query("ROLLBACK");
          return reply.status(404).send({ message: "Boleto nao encontrado." });
        }

        await client.query(
          `UPDATE finance_entries
          SET status = $1, notes = COALESCE(notes, $2)
          WHERE id = $3`,
          [mapBillStatusToEntryStatus(status), bill.instructions ?? null, bill.entry_id],
        );

        await client.query("COMMIT");
        return reply.send(mapFinanceBill(bill));
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
