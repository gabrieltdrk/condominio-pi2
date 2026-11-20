import type { BuildingApartmentOption } from "../../../features/predio/services/predio";
import type { GarageSpot } from "../../../features/garage/types";

export function normalizePlate(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
}

export function isValidBrazilianPlate(value: string) {
  const plate = normalizePlate(value);
  const oldPattern = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return oldPattern.test(plate) || mercosulPattern.test(plate);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(bStart).getTime() < new Date(aEnd).getTime();
}

export function chunkSpots(spots: GarageSpot[], size: number) {
  const chunks: GarageSpot[][] = [];
  for (let index = 0; index < spots.length; index += size) {
    chunks.push(spots.slice(index, index + size));
  }
  return chunks;
}

export function apartmentLabel(apartment: BuildingApartmentOption) {
  return `${apartment.tower} - Andar ${apartment.level} - Ap ${apartment.number}`;
}

export function labelToApartment(apartmentId: string | null, options: BuildingApartmentOption[]) {
  if (!apartmentId) return { apartmentId: null, apartmentLabel: null, residentName: null };
  const found = options.find((item) => item.id === apartmentId);
  return {
    apartmentId: found?.id ?? null,
    apartmentLabel: found ? apartmentLabel(found) : null,
    residentName: found?.residentName ?? null,
  };
}
