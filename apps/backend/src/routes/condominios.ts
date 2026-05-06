import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { requireAuth, requireMasterAdmin } from "../middleware/require-auth.js";

type CreateCondominioBody = {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

type CreateAdminBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
  condominioId: number;
};

export async function condominiosRoutes(app: FastifyInstance) {
  // ─── GET /condominios ─────────────────────────────────────────────────────
  // MASTER_ADMIN: todos os condomínios
  // Outros: apenas os condomínios do usuário
  app.get("/condominios", { preHandler: requireAuth }, async (request) => {
    if (request.user.role === "MASTER_ADMIN") {
      const result = await db.query(
        `SELECT id, name, cnpj, address, city, state, active, created_at
         FROM condominios ORDER BY name`,
      );
      return result.rows;
    }

    const result = await db.query(
      `SELECT c.id, c.name, c.cnpj, c.address, c.city, c.state, c.active, c.created_at, uc.role
       FROM condominios c
       JOIN usuario_condominio uc ON uc.condominio_id = c.id
       WHERE uc.user_id = $1 AND uc.active = true AND c.active = true
       ORDER BY c.name`,
      [request.user.sub],
    );
    return result.rows;
  });

  // ─── POST /condominios ────────────────────────────────────────────────────
  // Apenas MASTER_ADMIN cria condomínios
  app.post<{ Body: CreateCondominioBody }>(
    "/condominios",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
            cnpj: { type: ["string", "null"] },
            address: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            state: { type: ["string", "null"] },
          },
        },
      },
      preHandler: requireMasterAdmin,
    },
    async (request, reply) => {
      const { name, cnpj, address, city, state } = request.body;

      const result = await db.query(
        `INSERT INTO condominios (name, cnpj, address, city, state)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, cnpj, address, city, state, active, created_at`,
        [name, cnpj ?? null, address ?? null, city ?? null, state ?? null],
      );

      return reply.status(201).send(result.rows[0]);
    },
  );

  // ─── PATCH /condominios/:id ───────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: Partial<CreateCondominioBody & { active: boolean }> }>(
    "/condominios/:id",
    { preHandler: requireMasterAdmin },
    async (request, reply) => {
      const condominioId = Number(request.params.id);
      const { name, cnpj, address, city, state, active } = request.body;

      const result = await db.query(
        `UPDATE condominios
         SET
           name    = COALESCE($1, name),
           cnpj    = COALESCE($2, cnpj),
           address = COALESCE($3, address),
           city    = COALESCE($4, city),
           state   = COALESCE($5, state),
           active  = COALESCE($6, active)
         WHERE id = $7
         RETURNING id, name, cnpj, address, city, state, active, created_at`,
        [name ?? null, cnpj ?? null, address ?? null, city ?? null, state ?? null, active ?? null, condominioId],
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ message: "Condomínio não encontrado." });
      }

      return reply.send(result.rows[0]);
    },
  );

  // ─── POST /condominios/:id/admins ─────────────────────────────────────────
  // MASTER_ADMIN cria um ADMIN e já vincula ao condomínio
  app.post<{ Params: { id: string }; Body: Omit<CreateAdminBody, "condominioId"> }>(
    "/condominios/:id/admins",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "email", "phone", "password"],
          properties: {
            name: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            phone: { type: "string", minLength: 8 },
            password: { type: "string", minLength: 6 },
          },
        },
      },
      preHandler: requireMasterAdmin,
    },
    async (request, reply) => {
      const condominioId = Number(request.params.id);
      const { name, email, phone, password } = request.body;
      const password_hash = await bcrypt.hash(password, 10);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        // Verifica que o condomínio existe
        const condCheck = await client.query(
          "SELECT id FROM condominios WHERE id = $1 AND active = true",
          [condominioId],
        );
        if (condCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({ message: "Condomínio não encontrado." });
        }

        const userResult = await client.query(
          `INSERT INTO users (name, email, phone, password_hash, role)
           VALUES ($1, $2, $3, $4, 'ADMIN')
           RETURNING id, name, email, phone, role, created_at`,
          [name, email, phone, password_hash],
        );

        const newUser = userResult.rows[0];

        await client.query(
          `INSERT INTO usuario_condominio (user_id, condominio_id, role)
           VALUES ($1, $2, 'ADMIN')`,
          [newUser.id, condominioId],
        );

        await client.query("COMMIT");
        return reply.status(201).send({ ...newUser, condominioId });
      } catch (err: any) {
        await client.query("ROLLBACK");
        if (err.code === "23505") {
          return reply.status(409).send({ message: "Email já cadastrado." });
        }
        throw err;
      } finally {
        client.release();
      }
    },
  );

  // ─── POST /condominios/:id/members ────────────────────────────────────────
  // Vincula um usuário existente a um condomínio
  app.post<{ Params: { id: string }; Body: { userId: number; role: string } }>(
    "/condominios/:id/members",
    {
      schema: {
        body: {
          type: "object",
          required: ["userId", "role"],
          properties: {
            userId: { type: "integer" },
            role: { type: "string", enum: ["ADMIN", "MORADOR", "PORTEIRO"] },
          },
        },
      },
      preHandler: requireMasterAdmin,
    },
    async (request, reply) => {
      const condominioId = Number(request.params.id);
      const { userId, role } = request.body;

      try {
        const result = await db.query(
          `INSERT INTO usuario_condominio (user_id, condominio_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, condominio_id) DO UPDATE SET role = $3, active = true
           RETURNING id, user_id, condominio_id, role, active`,
          [userId, condominioId, role],
        );
        return reply.status(201).send(result.rows[0]);
      } catch (err: any) {
        if (err.code === "23503") {
          return reply.status(404).send({ message: "Usuário ou condomínio não encontrado." });
        }
        throw err;
      }
    },
  );
}
