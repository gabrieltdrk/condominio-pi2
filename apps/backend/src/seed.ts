/**
 * Run once to create the schema and insert demo users.
 *   npm run seed
 */
import bcrypt from "bcrypt";
import { db } from "./db.js";

const COST = 10;
const PASSWORD = "123456";

async function seed() {
  await db.query(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('ADMIN', 'MORADOR');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(120)  NOT NULL,
      email         VARCHAR(255)  NOT NULL UNIQUE,
      password_hash TEXT          NOT NULL,
      role          user_role     NOT NULL DEFAULT 'MORADOR',
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
  `);

  const hash = await bcrypt.hash(PASSWORD, COST);

  const users = [
    { name: "Admin", email: "admin@condominio.com", role: "ADMIN" },
    { name: "Morador", email: "morador@condominio.com", role: "MORADOR" },
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role]
    );
    console.log(`Upserted user: ${u.email}`);
  }

  console.log("Seed complete.");
  await db.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
