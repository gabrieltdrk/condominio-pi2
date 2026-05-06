import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

function mapResidentStatus(
  residentType: string | null,
  userStatus: string | null,
): "Proprietário" | "Inquilino" | "Visitante" {
  if (userStatus === "INATIVO" || residentType === "VISITANTE") return "Visitante";
  if (residentType === "INQUILINO") return "Inquilino";
  return "Proprietário";
}

export async function buildingRoutes(app: FastifyInstance) {
  // ─── GET /building ──────────────────────────────────────────────────────
  // Retorna estrutura de torres/andares/apartamentos do condomínio do token
  app.get("/building", { preHandler: requireAuth }, async (request) => {
    const condominioId = request.user.condominioId;

    const result = await db.query(
      `SELECT
         a.id as apartment_id,
         a.tower,
         a.level,
         a.number,
         u.id as user_id,
         u.name as user_name,
         u.email as user_email,
         u.phone as user_phone,
         u.resident_type as user_resident_type,
         u.status as user_status,
         u.car_plate as user_car_plate,
         u.pets_count as user_pets_count
       FROM apartments a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.condominio_id = $1
       ORDER BY a.tower, a.level DESC, a.number`,
      [condominioId],
    );

    const floorsMap = new Map<string, any>();

    for (const row of result.rows) {
      const key = `${row.tower}::${row.level}`;
      if (!floorsMap.has(key)) {
        floorsMap.set(key, { tower: row.tower, level: row.level, apartments: [] });
      }

      floorsMap.get(key).apartments.push({
        id: String(row.apartment_id),
        number: row.number,
        floor: row.level,
        resident: row.user_id
          ? {
              id: String(row.user_id),
              name: row.user_name,
              email: row.user_email,
              phone: row.user_phone ?? "",
              status: mapResidentStatus(row.user_resident_type, row.user_status),
              carPlate: row.user_car_plate ?? "",
              petsCount: row.user_pets_count ?? 0,
            }
          : null,
      });
    }

    return Array.from(floorsMap.values());
  });

  // ─── POST /apartments/:id/assign ────────────────────────────────────────
  app.post<{ Params: { id: string }; Body: { userId: number | null } }>(
    "/apartments/:id/assign",
    {
      schema: {
        body: { type: "object", properties: { userId: { type: ["integer", "null"] } } },
      },
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const condominioId = request.user.condominioId;
      const apartmentId = Number(request.params.id);
      const { userId } = request.body;

      // Garante que o apartamento pertence ao condomínio do ADMIN
      const check = await db.query(
        "SELECT id FROM apartments WHERE id = $1 AND condominio_id = $2",
        [apartmentId, condominioId],
      );

      if (check.rows.length === 0) {
        return reply.status(404).send({ message: "Apartamento não encontrado neste condomínio." });
      }

      await db.query(
        "UPDATE apartments SET user_id = $1 WHERE id = $2",
        [userId ?? null, apartmentId],
      );

      return reply.send({ success: true });
    },
  );
}
