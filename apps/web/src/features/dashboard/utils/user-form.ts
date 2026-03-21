import type { CreateUserPayload } from "../services/users";

export const PHONE_PATTERN = "^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$";
export const PHONE_INPUT_TITLE = "Use o formato (11) 99999-9999";
export const CAR_PLATE_PATTERN = "^[A-Z]{3}(?:-?\\d{4}|\\d[A-Z]\\d{2})$";
export const CAR_PLATE_INPUT_TITLE = "Use o formato ABC-1234 ou ABC1D23";

export const RESIDENT_TYPE_LABEL: Record<CreateUserPayload["residentType"], string> = {
  PROPRIETARIO: "Proprietário",
  INQUILINO: "Inquilino",
  VISITANTE: "Visitante",
};

export const USER_STATUS_LABEL: Record<CreateUserPayload["status"], string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function normalizePhone(value: string) {
  return formatPhone(value).trim();
}

export function isPhoneValid(value: string) {
  return new RegExp(PHONE_PATTERN).test(normalizePhone(value));
}

export function normalizeCarPlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function formatCarPlate(value: string) {
  const normalized = normalizeCarPlate(value);

  if (/^[A-Z]{3}\d{1,4}$/.test(normalized)) {
    if (normalized.length <= 3) return normalized;
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }

  return normalized;
}

export function isCarPlateValid(value: string) {
  const normalized = normalizeCarPlate(value);
  return normalized.length === 0 || new RegExp(CAR_PLATE_PATTERN).test(normalized);
}
