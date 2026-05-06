import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { requireAuth, requireMasterAdmin } from "../middleware/require-auth.js";

const CONDO_FIELDS = `
  id, name, cnpj, address, city, state, active, created_at,
  zip_code, neighborhood, number, reference,
  manager_name, manager_phone, management_company,
  has_pool, pool_count, has_gym, gym_count,
  has_party_room, party_room_count, has_bbq, bbq_count
`;

type CondominioBody = {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  active?: boolean;
  zip_code?: string | null;
  neighborhood?: string | null;
  number?: string | null;
  reference?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  management_company?: string | null;
  has_pool?: boolean;
  pool_count?: number;
  has_gym?: boolean;
  gym_count?: number;
  has_party_room?: boolean;
  party_room_count?: number;
  has_bbq?: boolean;
  bbq_count?: number;
};

type CreateAdminBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export async function condominiosRoutes(app: FastifyInstance) {
  // ─── GET /condominios ─────────────────────────────────────────────────────
  app.get("/condominios", { preHandler: requireAuth }, async (request) => {
    if (request.user.role === "MASTER_ADMIN") {
      const result = await db.query(
        `SELECT ${CONDO_FIELDS} FROM condominios ORDER BY name`,
      );
      return result.rows;
    }

    const result = await db.query(
      `SELECT c.id, c.name, c.cnpj, c.address, c.city, c.state, c.active, c.created_at,
              c.zip_code, c.neighborhood, c.number, c.reference,
              c.manager_name, c.manager_phone, c.management_company,
              c.has_pool, c.pool_count, c.has_gym, c.gym_count,
              c.has_party_room, c.party_room_count, c.has_bbq, c.bbq_count,
              uc.role AS user_role
       FROM condominios c
       JOIN usuario_condominio uc ON uc.condominio_id = c.id
       WHERE uc.user_id = $1 AND uc.active = true AND c.active = true
       ORDER BY c.name`,
      [request.user.sub],
    );
    return result.rows;
  });

  // ─── POST /condominios ────────────────────────────────────────────────────
  app.post<{ Body: CondominioBody }>(
    "/condominios",
    { preHandler: requireMasterAdmin },
    async (request, reply) => {
      const {
        name, cnpj, address, city, state,
        zip_code, neighborhood, number, reference,
        manager_name, manager_phone, management_company,
        has_pool = false, pool_count = 0,
        has_gym = false, gym_count = 0,
        has_party_room = false, party_room_count = 0,
        has_bbq = false, bbq_count = 0,
      } = request.body;

      const result = await db.query(
        `INSERT INTO condominios (
           name, cnpj, address, city, state,
           zip_code, neighborhood, number, reference,
           manager_name, manager_phone, management_company,
           has_pool, pool_count, has_gym, gym_count,
           has_party_room, party_room_count, has_bbq, bbq_count
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING ${CONDO_FIELDS}`,
        [
          name, cnpj ?? null, address ?? null, city ?? null, state ?? null,
          zip_code ?? null, neighborhood ?? null, number ?? null, reference ?? null,
          manager_name ?? null, manager_phone ?? null, management_company ?? null,
          has_pool, pool_count, has_gym, gym_count,
          has_party_room, party_room_count, has_bbq, bbq_count,
        ],
      );

      return reply.status(201).send(result.rows[0]);
    },
  );

  // ─── PATCH /condominios/:id ───────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: Partial<CondominioBody> }>(
    "/condominios/:id",
    { preHandler: requireMasterAdmin },
    async (request, reply) => {
      const condominioId = Number(request.params.id);
      const {
        name, cnpj, address, city, state, active,
        zip_code, neighborhood, number, reference,
        manager_name, manager_phone, management_company,
        has_pool, pool_count, has_gym, gym_count,
        has_party_room, party_room_count, has_bbq, bbq_count,
      } = request.body;

      const result = await db.query(
        `UPDATE condominios SET
           name               = COALESCE($1,  name),
           cnpj               = COALESCE($2,  cnpj),
           address            = COALESCE($3,  address),
           city               = COALESCE($4,  city),
           state              = COALESCE($5,  state),
           active             = COALESCE($6,  active),
           zip_code           = COALESCE($7,  zip_code),
           neighborhood       = COALESCE($8,  neighborhood),
           number             = COALESCE($9,  number),
           reference          = COALESCE($10, reference),
           manager_name       = COALESCE($11, manager_name),
           manager_phone      = COALESCE($12, manager_phone),
           management_company = COALESCE($13, management_company),
           has_pool           = COALESCE($14, has_pool),
           pool_count         = COALESCE($15, pool_count),
           has_gym            = COALESCE($16, has_gym),
           gym_count          = COALESCE($17, gym_count),
           has_party_room     = COALESCE($18, has_party_room),
           party_room_count   = COALESCE($19, party_room_count),
           has_bbq            = COALESCE($20, has_bbq),
           bbq_count          = COALESCE($21, bbq_count)
         WHERE id = $22
         RETURNING ${CONDO_FIELDS}`,
        [
          name ?? null, cnpj ?? null, address ?? null, city ?? null, state ?? null, active ?? null,
          zip_code ?? null, neighborhood ?? null, number ?? null, reference ?? null,
          manager_name ?? null, manager_phone ?? null, management_company ?? null,
          has_pool ?? null, pool_count ?? null, has_gym ?? null, gym_count ?? null,
          has_party_room ?? null, party_room_count ?? null, has_bbq ?? null, bbq_count ?? null,
          condominioId,
        ],
      );

      if (!result.rows[0]) {
        return reply.status(404).send({ message: "Condomínio não encontrado." });
      }

      return reply.send(result.rows[0]);
    },
  );

  // ─── DELETE /condominios/:id ──────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    "/condominios/:id",
    { preHandler: requireMasterAdmin },
    async (request, reply) => {
      const condominioId = Number(request.params.id);
      const result = await db.query(
        `UPDATE condominios SET active = false WHERE id = $1 RETURNING id`,
        [condominioId],
      );
      if (!result.rows[0]) {
        return reply.status(404).send({ message: "Condomínio não encontrado." });
      }
      return reply.send({ ok: true });
    },
  );

  // ─── POST /condominios/:id/admins ─────────────────────────────────────────
  app.post<{ Params: { id: string }; Body: CreateAdminBody }>(
    "/condominios/:id/admins",
    { preHandler: requireMasterAdmin },
    async (request, reply) => {
      const condominioId = Number(request.params.id);
      const { name, email, phone, password } = request.body;
      const password_hash = await bcrypt.hash(password, 10);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

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
  app.post<{ Params: { id: string }; Body: { userId: number; role: string } }>(
    "/condominios/:id/members",
    { preHandler: requireMasterAdmin },
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
