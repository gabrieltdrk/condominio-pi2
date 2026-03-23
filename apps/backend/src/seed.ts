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
    DO $$ BEGIN
      CREATE TYPE resident_type AS ENUM ('PROPRIETARIO', 'INQUILINO', 'VISITANTE');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.query(`
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('ATIVO', 'INATIVO');
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
      phone         VARCHAR(32),
      resident_type resident_type NOT NULL DEFAULT 'PROPRIETARIO',
      status        user_status   NOT NULL DEFAULT 'ATIVO',
      car_plate     VARCHAR(16),
      pets_count    INTEGER,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
      ADD COLUMN IF NOT EXISTS resident_type resident_type NOT NULL DEFAULT 'PROPRIETARIO',
      ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'ATIVO',
      ADD COLUMN IF NOT EXISTS car_plate VARCHAR(16),
      ADD COLUMN IF NOT EXISTS pets_count INTEGER;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS apartments (
      id          SERIAL PRIMARY KEY,
      tower       VARCHAR(32) NOT NULL,
      level       INTEGER NOT NULL,
      number      VARCHAR(16) NOT NULL,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (tower, level, number)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_entries (
      id             SERIAL PRIMARY KEY,
      type           VARCHAR(16) NOT NULL CHECK (type IN ('REVENUE', 'EXPENSE')),
      identifier     VARCHAR(64) NOT NULL UNIQUE,
      description    TEXT NOT NULL,
      amount         NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
      reference_date DATE NOT NULL,
      due_date       DATE,
      counterparty   VARCHAR(160) NOT NULL,
      unit           VARCHAR(64),
      resident       VARCHAR(160),
      category       VARCHAR(80) NOT NULL,
      payment_method VARCHAR(32) NOT NULL,
      status         VARCHAR(32) NOT NULL,
      document_name  VARCHAR(255),
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const hash = await bcrypt.hash(PASSWORD, COST);

  const users = [
    {
      name: "Admin",
      email: "admin@condominio.com",
      role: "ADMIN",
      phone: "(11) 99999-0000",
      resident_type: "PROPRIETARIO",
      status: "ATIVO",
      car_plate: "ADM-0001",
      pets_count: 0,
    },
    {
      name: "Morador",
      email: "morador@condominio.com",
      role: "MORADOR",
      phone: "(11) 98888-0000",
      resident_type: "PROPRIETARIO",
      status: "ATIVO",
      car_plate: "MOR-1234",
      pets_count: 1,
    },
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone, resident_type, status, car_plate, pets_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role, u.phone, u.resident_type, u.status, u.car_plate, u.pets_count]
    );
    console.log(`Upserted user: ${u.email}`);
  }

  // Assign the 'Morador' user to a few apartments for demo.
  const morador = await db.query(`SELECT id FROM users WHERE email = $1`, ["morador@condominio.com"]);
  const moradorId = morador.rows[0]?.id;

  if (moradorId) {
    await db.query(
      `INSERT INTO apartments (tower, level, number, user_id)
       VALUES
         ('Torre A', 7, '701', $1),
         ('Torre B', 3, '304', $1)
       ON CONFLICT (tower, level, number) DO NOTHING`,
      [moradorId]
    );
  }

  const financeEntries = [
    ["REVENUE", "REC-2026-001", "Taxa condominial de marco", 780, "2026-03-05", null, "Gabriel Ferreira", "Torre A - Ap 101", "Gabriel Ferreira", "Taxa condominial", "Pix", "Recebido", "comprovante-marco-101.pdf", "Pagamento dentro do prazo."],
    ["REVENUE", "REC-2026-002", "Taxa condominial de marco", 780, "2026-03-08", null, "Helena Moraes", "Torre B - Ap 101", "Helena Moraes", "Taxa condominial", "Boleto", "Recebido", "boleto-pago-101-marco.pdf", ""],
    ["REVENUE", "REC-2026-003", "Taxa condominial fevereiro", 1240, "2026-02-23", null, "Carlos Henrique", "Torre A - Ap 203", "Carlos Henrique", "Taxa condominial", "Boleto", "Atrasado", "boleto-fevereiro-203.pdf", "Aguardando retorno do morador."],
    ["REVENUE", "REC-2026-004", "Multa por uso indevido da vaga", 180, "2026-03-10", null, "Fernanda Souza", "Torre B - Ap 504", "Fernanda Souza", "Multa", "Pix", "Em aberto", "auto-infracao-504.pdf", "Prazo de recurso ate 15/03."],
    ["REVENUE", "REC-2026-005", "Aluguel do salao de festas", 450, "2026-03-11", null, "Reserva eventual", "Area comum", "Reserva eventual", "Aluguel areas comuns", "Pix", "Recebido", "contrato-salao-marco.pdf", ""],
    ["EXPENSE", "DES-2026-001", "Folha da equipe de limpeza", 3200, "2026-03-01", "2026-03-10", "LimpaForte Servicos", null, null, "Limpeza", "Pix", "Pago", "nf-limpeza-marco.pdf", "Prestacao mensal recorrente."],
    ["EXPENSE", "DES-2026-002", "Conta de energia das areas comuns", 2480, "2026-03-04", "2026-03-18", "Companhia de Energia", null, null, "Energia", "Boleto", "Pendente", "boleto-energia-marco.pdf", ""],
    ["EXPENSE", "DES-2026-003", "Manutencao preventiva dos elevadores", 1950, "2026-03-02", "2026-03-16", "Elevadores Sigma", null, null, "Manutencao", "Boleto", "Pendente", "nf-elevadores-0316.pdf", "Visita mensal contratada."],
    ["EXPENSE", "DES-2026-004", "Acordo emergencial de encanamento", 890, "2026-03-09", "2026-03-20", "Hidro Plantao", null, null, "Agua", "Pix", "Em negociacao", "recibo-hidraulica-plantao.pdf", "Parcelamento em avaliacao."],
  ];

  for (const entry of financeEntries) {
    await db.query(
      `INSERT INTO finance_entries (
        type, identifier, description, amount, reference_date, due_date, counterparty,
        unit, resident, category, payment_method, status, document_name, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (identifier) DO NOTHING`,
      entry,
    );
  }

  console.log("Seed complete.");
  await db.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
