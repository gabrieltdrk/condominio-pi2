import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";

type LoginBody = {
  email: string;
  password: string;
};

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const result = await db.query(
        `SELECT id, name, email, phone, role, resident_type, status, password_hash
         FROM users
         WHERE email = $1`,
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return reply.status(401).send({ message: "Email ou senha inválidos." });
      }

      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        return reply.status(401).send({ message: "Email ou senha inválidos." });
      }

      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: "8h" }
      );

      return reply.send({
        token,
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          residentType: user.resident_type,
          status: user.status,
        },
      });
    }
  );
}
