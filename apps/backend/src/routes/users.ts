import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";

type CreateUserBody = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MORADOR";
};

export async function usersRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateUserBody }>(
    "/users",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            role: { type: "string", enum: ["ADMIN", "MORADOR"] },
          },
        },
      },
    },
    async (request, reply) => {
      await request.jwtVerify();

      if (request.user.role !== "ADMIN") {
        return reply.status(403).send({ message: "Acesso restrito a administradores." });
      }

      const { name, email, password, role } = request.body;

      const password_hash = await bcrypt.hash(password, 10);

      try {
        const result = await db.query(
          `INSERT INTO users (name, email, password_hash, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, email, role, created_at`,
          [name, email, password_hash, role]
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
