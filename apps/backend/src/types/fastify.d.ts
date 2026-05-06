import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: number;
      email: string;
      role: string;
      condominioId: number | null;
      /** 'full' = normal session; 'selection' = pending condominio choice */
      tokenType?: "full" | "selection";
    };
    user: {
      sub: number;
      email: string;
      role: string;
      condominioId: number | null;
      tokenType?: "full" | "selection";
    };
  }
}
