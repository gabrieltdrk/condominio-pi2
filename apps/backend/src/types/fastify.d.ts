import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: number; email: string; role: string };
    user: { sub: number; email: string; role: string };
  }
}
