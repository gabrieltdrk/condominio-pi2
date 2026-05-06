import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { buildingRoutes } from "./routes/building.js";
import { financeRoutes } from "./routes/finance.js";
import { condominiosRoutes } from "./routes/condominios.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "change-me-in-production",
});

await app.register(authRoutes);
await app.register(usersRoutes);
await app.register(buildingRoutes);
await app.register(financeRoutes);
await app.register(condominiosRoutes);

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 3333);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Server running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
