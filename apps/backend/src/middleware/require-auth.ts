import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Verifica o JWT e garante que o token é do tipo 'full' (já tem condominioId resolvido).
 * Injeta request.user com { sub, email, role, condominioId }.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify();

  if (request.user.tokenType === "selection") {
    return reply.status(401).send({
      message: "Seleção de condomínio pendente. Use POST /auth/select-condominio.",
    });
  }
}

/**
 * Garante que o usuário autenticado tem role MASTER_ADMIN.
 */
export async function requireMasterAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (request.user.role !== "MASTER_ADMIN") {
    return reply.status(403).send({ message: "Acesso restrito ao administrador master." });
  }
}

/**
 * Garante role ADMIN ou MASTER_ADMIN.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (!["ADMIN", "MASTER_ADMIN"].includes(request.user.role)) {
    return reply.status(403).send({ message: "Acesso restrito a administradores." });
  }
}
