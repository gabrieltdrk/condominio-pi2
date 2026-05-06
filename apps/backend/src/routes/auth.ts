import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db.js";

type LoginBody = { email: string; password: string };
type SelectCondominioBody = { condominioId: number };

export async function authRoutes(app: FastifyInstance) {
  // ─── POST /auth/login ────────────────────────────────────────────────────
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

      const userResult = await db.query(
        `SELECT id, name, email, phone, role, resident_type, status, password_hash
         FROM users WHERE email = $1`,
        [email],
      );

      const user = userResult.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return reply.status(401).send({ message: "Email ou senha inválidos." });
      }

      // MASTER_ADMIN: não precisa de condomínio — token sem condominioId
      if (user.role === "MASTER_ADMIN") {
        const token = app.jwt.sign(
          { sub: user.id, email: user.email, role: user.role, condominioId: null, tokenType: "full" },
          { expiresIn: "8h" },
        );
        return reply.send({
          token,
          user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
        });
      }

      // Busca vínculos do usuário com condomínios
      const ucResult = await db.query(
        `SELECT uc.condominio_id, uc.role, c.name AS condominio_name
         FROM usuario_condominio uc
         JOIN condominios c ON c.id = uc.condominio_id
         WHERE uc.user_id = $1 AND uc.active = true AND c.active = true
         ORDER BY c.name`,
        [user.id],
      );

      const links = ucResult.rows;

      if (links.length === 0) {
        return reply.status(403).send({ message: "Usuário não está vinculado a nenhum condomínio." });
      }

      // Usuário vinculado a um único condomínio → token completo direto
      if (links.length === 1) {
        const link = links[0];
        const token = app.jwt.sign(
          { sub: user.id, email: user.email, role: link.role, condominioId: link.condominio_id, tokenType: "full" },
          { expiresIn: "8h" },
        );
        return reply.send({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: link.role,
            condominioId: link.condominio_id,
            condominioName: link.condominio_name,
          },
        });
      }

      // Múltiplos condomínios → token de seleção temporário (30 min)
      const selectionToken = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role, condominioId: null, tokenType: "selection" },
        { expiresIn: "30m" },
      );

      return reply.send({
        requiresSelection: true,
        selectionToken,
        condominios: links.map((l) => ({
          id: l.condominio_id,
          name: l.condominio_name,
          role: l.role,
        })),
        user: { id: user.id, name: user.name, email: user.email },
      });
    },
  );

  // ─── POST /auth/select-condominio ────────────────────────────────────────
  // Requer o selectionToken no header Authorization
  app.post<{ Body: SelectCondominioBody }>(
    "/auth/select-condominio",
    {
      schema: {
        body: {
          type: "object",
          required: ["condominioId"],
          properties: { condominioId: { type: "integer" } },
        },
      },
    },
    async (request, reply) => {
      // Valida o selectionToken
      await request.jwtVerify();

      if (request.user.tokenType !== "selection") {
        return reply.status(400).send({ message: "Token inválido para seleção de condomínio." });
      }

      const userId = request.user.sub;
      const { condominioId } = request.body;

      // Confirma que o usuário realmente pertence ao condomínio escolhido
      const ucResult = await db.query(
        `SELECT uc.role, c.name AS condominio_name
         FROM usuario_condominio uc
         JOIN condominios c ON c.id = uc.condominio_id
         WHERE uc.user_id = $1 AND uc.condominio_id = $2
           AND uc.active = true AND c.active = true`,
        [userId, condominioId],
      );

      if (ucResult.rows.length === 0) {
        return reply.status(403).send({ message: "Acesso negado a este condomínio." });
      }

      const { role, condominio_name } = ucResult.rows[0];

      const userResult = await db.query(
        `SELECT id, name, email, phone FROM users WHERE id = $1`,
        [userId],
      );
      const user = userResult.rows[0];

      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role, condominioId, tokenType: "full" },
        { expiresIn: "8h" },
      );

      return reply.send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role,
          condominioId,
          condominioName: condominio_name,
        },
      });
    },
  );
}
