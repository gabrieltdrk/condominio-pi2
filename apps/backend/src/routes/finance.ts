import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

type FinanceEntryType = "REVENUE" | "EXPENSE";

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

export async function financeRoutes(app: FastifyInstance) {
  app.get("/finance/entries", async () => {
    const result = await db.query(
      `SELECT
        id,
        type,
        identifier,
        description,
        amount,
        reference_date,
        due_date,
        counterparty,
        unit,
        resident,
        category,
        payment_method,
        status,
        document_name,
        notes,
        created_at
      FROM finance_entries
      ORDER BY reference_date DESC, created_at DESC`,
    );

    return result.rows;
  });

  app.post<{ Body: CreateFinanceEntryBody }>(
    "/finance/entries",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "type",
            "identifier",
            "description",
            "amount",
            "referenceDate",
            "counterparty",
            "category",
            "paymentMethod",
            "status",
          ],
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
    },
    async (request, reply) => {
      const body = request.body;

      const result = await db.query(
        `INSERT INTO finance_entries (
          type,
          identifier,
          description,
          amount,
          reference_date,
          due_date,
          counterparty,
          unit,
          resident,
          category,
          payment_method,
          status,
          document_name,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING
          id,
          type,
          identifier,
          description,
          amount,
          reference_date,
          due_date,
          counterparty,
          unit,
          resident,
          category,
          payment_method,
          status,
          document_name,
          notes,
          created_at`,
        [
          body.type,
          body.identifier,
          body.description,
          body.amount,
          body.referenceDate,
          body.dueDate ?? null,
          body.counterparty,
          body.unit ?? null,
          body.resident ?? null,
          body.category,
          body.paymentMethod,
          body.status,
          body.documentName ?? null,
          body.notes ?? null,
        ],
      );

      return reply.status(201).send(result.rows[0]);
    },
  );
}
