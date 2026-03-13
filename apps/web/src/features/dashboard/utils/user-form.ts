import type { CreateUserPayload } from "../services/users";

export const PHONE_PATTERN = "^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$";
export const PHONE_INPUT_TITLE = "Use o formato (11) 99999-9999";

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
