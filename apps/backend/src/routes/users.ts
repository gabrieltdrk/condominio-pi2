import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

type CreateUserBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "ADMIN" | "MORADOR" | "PORTEIRO";
  residentType: "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
  status: "ATIVO" | "INATIVO";
};

export async function usersRoutes(app: FastifyInstance) {
  // ─── GET /users ─────────────────────────────────────────────────────────
  // Retorna apenas usuários do condomínio do token
  app.get(
    "/users",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const condominioId = request.user.condominioId;

      // MASTER_ADMIN pode listar todos sem filtro de condomínio
      if (request.user.role === "MASTER_ADMIN") {
        const result = await db.query(
          `SELECT id, name, email, phone, role, resident_type, status, created_at
           FROM users ORDER BY created_at DESC`,
        );
        return reply.send(result.rows);
      }

      const result = await db.query(
        `SELECT u.id, u.name, u.email, u.phone, uc.role, u.resident_type, u.status, u.created_at
         FROM users u
         JOIN usuario_condominio uc ON uc.user_id = u.id
         WHERE uc.condominio_id = $1 AND uc.active = true
         ORDER BY u.created_at DESC`,
        [condominioId],
      );

      return reply.send(result.rows);
    },
  );

  // ─── POST /users ─────────────────────────────────────────────────────────
  // Cria usuário e já vincula ao condomínio do ADMIN
  app.post<{ Body: CreateUserBody }>(
    "/users",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "email", "phone", "password", "role", "residentType", "status"],
          properties: {
            name: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            phone: { type: "string", minLength: 8 },
            password: { type: "string", minLength: 6 },
            role: { type: "string", enum: ["ADMIN", "MORADOR", "PORTEIRO"] },
            residentType: { type: "string", enum: ["PROPRIETARIO", "INQUILINO", "VISITANTE"] },
            status: { type: "string", enum: ["ATIVO", "INATIVO"] },
          },
        },
      },
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const condominioId = request.user.condominioId;

      // ADMIN só pode criar usuários dentro do próprio condomínio
      if (request.user.role === "ADMIN" && !condominioId) {
        return reply.status(400).send({ message: "condominioId ausente no token." });
      }

      const { name, email, phone, password, role, residentType, status } = request.body;
      const password_hash = await bcrypt.hash(password, 10);
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        const userResult = await client.query(
          `INSERT INTO users (name, email, phone, password_hash, role, resident_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, name, email, phone, role, resident_type, status, created_at`,
          [name, email, phone, password_hash, role, residentType, status],
        );

        const newUser = userResult.rows[0];

        // Vincula ao condomínio automaticamente
        if (condominioId) {
          await client.query(
            `INSERT INTO usuario_condominio (user_id, condominio_id, role)
             VALUES ($1, $2, $3)`,
            [newUser.id, condominioId, role],
          );
        }

        await client.query("COMMIT");
        return reply.status(201).send(newUser);
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

  // ─── DELETE /users/:id ────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const condominioId = request.user.condominioId;
      const userId = Number(request.params.id);

      if (request.user.role !== "MASTER_ADMIN") {
        // Verifica que o usuário pertence ao condomínio do ADMIN
        const check = await db.query(
          `SELECT id FROM usuario_condominio WHERE user_id = $1 AND condominio_id = $2`,
          [userId, condominioId],
        );
        if (check.rows.length === 0) {
          return reply.status(403).send({ message: "Usuário não pertence a este condomínio." });
        }
      }

      await db.query("DELETE FROM users WHERE id = $1", [userId]);
      return reply.send({ success: true });
    },
  );

  // ─── GET /users/me ────────────────────────────────────────────────────────
  app.get("/users/me", { preHandler: requireAuth }, async (request, reply) => {
    const result = await db.query(
      `SELECT id, name, email, phone, role, resident_type, status, car_plate, pets_count
       FROM users WHERE id = $1`,
      [request.user.sub],
    );
    if (!result.rows[0]) return reply.status(404).send({ message: "Usuário não encontrado." });
    return reply.send(result.rows[0]);
  });
}
