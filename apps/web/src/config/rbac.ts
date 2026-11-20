import type { UserRole } from "../features/auth/services/auth";
import type { PlanId } from "./plans";
import { hasFeature } from "./plans";

// ─── Definição de rotas e suas permissões ─────────────────────────────────────
// allowedRoles: quais roles podem acessar (undefined = todos autenticados)
// requiresPlan: feature do plano necessária (undefined = sem restrição de plano)

export type RoutePermission = {
  allowedRoles?: UserRole[];
  requiresPlan?: Parameters<typeof hasFeature>[1];
};

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  "/dashboard":   {},
  "/avisos":      {},
  "/chat":        {},
  "/enquetes":    {},
  "/perfil":      {},

  "/ocorrencias": { requiresPlan: "ocorrencias" },
  "/agendamentos":      {},
  "/agendamentos/novo": {},
  "/garagem":     { allowedRoles: ["ADMIN", "MORADOR", "PORTEIRO"] },
  "/visitantes":  { allowedRoles: ["ADMIN", "MORADOR", "PORTEIRO"] },
  "/encomendas":  { allowedRoles: ["ADMIN", "MORADOR", "PORTEIRO"] },
  "/financeiro":         { allowedRoles: ["ADMIN", "MORADOR"], requiresPlan: "financeiro" },
  "/financeiro/contas":  { allowedRoles: ["ADMIN"], requiresPlan: "financeiro" },
  "/relatorios":  { allowedRoles: ["ADMIN"], requiresPlan: "relatoriosFinanceiros" },
  "/manutencao":  {},

  "/predio":                 { allowedRoles: ["ADMIN", "MASTER_ADMIN"] },
  "/predio/documentos":      { allowedRoles: ["ADMIN"] },
  "/predio/documentos/novo": { allowedRoles: ["ADMIN"] },
  "/areas-comuns":  { allowedRoles: ["ADMIN"] },
  "/usuarios":    { allowedRoles: ["ADMIN", "MORADOR", "MASTER_ADMIN"] },

  "/condominios": { allowedRoles: ["MASTER_ADMIN"] },
  "/planos":      { allowedRoles: ["MASTER_ADMIN"] },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function canAccessRoute(
  path: string,
  role: UserRole | undefined,
  plan: PlanId,
): boolean {
  // MASTER_ADMIN tem acesso irrestrito
  if (role === "MASTER_ADMIN") return true;

  const perm = ROUTE_PERMISSIONS[path];
  if (!perm) return true; // rota não mapeada: permite

  if (perm.allowedRoles && role && !perm.allowedRoles.includes(role)) return false;
  if (perm.requiresPlan && !hasFeature(plan, perm.requiresPlan)) return false;

  return true;
}

// ─── Permissões de UI por role ────────────────────────────────────────────────

export const ROLE_UI_PERMISSIONS: Record<UserRole, {
  canCreateAvisos: boolean;
  canDeleteAvisos: boolean;
  canFixarAvisos: boolean;
  canManageUsers: boolean;
  canManageBuilding: boolean;
  canManageFinanceiro: boolean;
  canManageCondominios: boolean;
  canManagePlanos: boolean;
}> = {
  MASTER_ADMIN: {
    canCreateAvisos: true,
    canDeleteAvisos: true,
    canFixarAvisos: true,
    canManageUsers: true,
    canManageBuilding: true,
    canManageFinanceiro: true,
    canManageCondominios: true,
    canManagePlanos: true,
  },
  ADMIN: {
    canCreateAvisos: true,
    canDeleteAvisos: true,
    canFixarAvisos: true,
    canManageUsers: true,
    canManageBuilding: true,
    canManageFinanceiro: true,
    canManageCondominios: false,
    canManagePlanos: false,
  },
  MORADOR: {
    canCreateAvisos: false,
    canDeleteAvisos: false,
    canFixarAvisos: false,
    canManageUsers: false,
    canManageBuilding: false,
    canManageFinanceiro: false,
    canManageCondominios: false,
    canManagePlanos: false,
  },
  PORTEIRO: {
    canCreateAvisos: false,
    canDeleteAvisos: false,
    canFixarAvisos: false,
    canManageUsers: false,
    canManageBuilding: false,
    canManageFinanceiro: false,
    canManageCondominios: false,
    canManagePlanos: false,
  },
};

export function getRolePermissions(role: UserRole | undefined) {
  if (!role) return ROLE_UI_PERMISSIONS.MORADOR;
  return ROLE_UI_PERMISSIONS[role] ?? ROLE_UI_PERMISSIONS.MORADOR;
}
