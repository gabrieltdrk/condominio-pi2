import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";

type CreateUserBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "ADMIN" | "MORADOR";
  residentType: "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
  status: "ATIVO" | "INATIVO";
};

export async function usersRoutes(app: FastifyInstance) {
  app.get("/users", async (request, reply) => {
    await request.jwtVerify();

    if (request.user.role !== "ADMIN") {
      return reply.status(403).send({ message: "Acesso restrito a administradores." });
    }

    const result = await db.query(
      `SELECT id, name, email, phone, role, resident_type, status, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return reply.send(result.rows);
  });

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
            role: { type: "string", enum: ["ADMIN", "MORADOR"] },
            residentType: { type: "string", enum: ["PROPRIETARIO", "INQUILINO", "VISITANTE"] },
            status: { type: "string", enum: ["ATIVO", "INATIVO"] },
          },
        },
      },
    },
    async (request, reply) => {
      await request.jwtVerify();

      if (request.user.role !== "ADMIN") {
        return reply.status(403).send({ message: "Acesso restrito a administradores." });
      }

      const { name, email, phone, password, role, residentType, status } = request.body;

      const password_hash = await bcrypt.hash(password, 10);

      try {
        const result = await db.query(
          `INSERT INTO users (name, email, phone, password_hash, role, resident_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, name, email, phone, role, resident_type, status, created_at`,
          [name, email, phone, password_hash, role, residentType, status]
        );

        return reply.status(201).send(result.rows[0]);
      } catch (err: any) {
        if (err.code === "23505") {
          return reply.status(409).send({ message: "Email já cadastrado." });
        }
        throw err;
      }
    }
  );
}
