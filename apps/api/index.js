import Fastify from "fastify";
import jwt from "@fastify/jwt";
import mongodb from "@fastify/mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({ logger: true });

// Conectar ao MongoDB
app.register(mongodb, {
  forceClose: true,
  url: process.env.MONGO_URL,
});

// Configurar JWT
app.register(jwt, {
  secret: process.env.JWT_SECRET,
});

// Rodar o servidor
app.listen({ port: process.env.PORT || 3001 }, (err) => {
  if (err) {
    console.error(err);
  }
  console.log(`Servidor backend rodando na porta ${process.env.PORT || 3001}`);
});