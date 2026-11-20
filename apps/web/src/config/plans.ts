export type PlanId = "go" | "plus" | "ultra" | null | undefined;

export type PlanFeatures = {
  avisos: boolean;
  financeiro: boolean;
  agendamentos: boolean;
  ocorrencias: boolean;
  relatoriosFinanceiros: boolean;
  suportePrioritario: boolean;
  relatoriosAvancados: boolean;
  suporteDedicado: boolean;
};

export type PlanLimits = {
  maxResidents: number;
  maxAdmins: number;
  features: PlanFeatures;
};

export type PlanPricing = {
  monthly: number | null;
  annual: number | null;
  annualTotal: number | null;
};

export type PlanDefinition = PlanLimits & {
  id: string;
  label: string;
  pricing: PlanPricing;
  upgradeMessage: string;
};

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  go: {
    id: "go",
    label: "OmniGO",
    maxResidents: 20,
    maxAdmins: 1,
    pricing: {
      monthly: 10999,
      annual: 9166,
      annualTotal: 109992,
    },
    upgradeMessage: "Faça upgrade para o Omni+ ou OmniUltra para acessar este recurso.",
    features: {
      avisos: true,
      financeiro: true,
      agendamentos: true,
      ocorrencias: false,
      relatoriosFinanceiros: false,
      suportePrioritario: false,
      relatoriosAvancados: false,
      suporteDedicado: false,
    },
  },
  plus: {
    id: "plus",
    label: "Omni+",
    maxResidents: 100,
    maxAdmins: 3,
    pricing: {
      monthly: 16999,
      annual: 14166,
      annualTotal: 169992,
    },
    upgradeMessage: "Faça upgrade para o OmniUltra para acessar este recurso.",
    features: {
      avisos: true,
      financeiro: true,
      agendamentos: true,
      ocorrencias: true,
      relatoriosFinanceiros: true,
      suportePrioritario: true,
      relatoriosAvancados: false,
      suporteDedicado: false,
    },
  },
  ultra: {
    id: "ultra",
    label: "OmniUltra",
    maxResidents: Infinity,
    maxAdmins: Infinity,
    pricing: {
      monthly: null,
      annual: null,
      annualTotal: null,
    },
    upgradeMessage: "",
    features: {
      avisos: true,
      financeiro: true,
      agendamentos: true,
      ocorrencias: true,
      relatoriosFinanceiros: true,
      suportePrioritario: true,
      relatoriosAvancados: true,
      suporteDedicado: true,
    },
  },
};

// Backward-compat: PLAN_LIMITS still derived from PLAN_DEFINITIONS
export const PLAN_LIMITS: Record<string, PlanLimits> = Object.fromEntries(
  Object.entries(PLAN_DEFINITIONS).map(([k, v]) => [k, { maxResidents: v.maxResidents, maxAdmins: v.maxAdmins, features: v.features }]),
);

export const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_DEFINITIONS).map(([k, v]) => [k, v.label]),
);

export const PLAN_UPGRADE_MESSAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_DEFINITIONS).map(([k, v]) => [k, v.upgradeMessage]),
);

export function getPlanLimits(plan: PlanId): PlanLimits {
  if (!plan) return PLAN_LIMITS.go;
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.go;
}

export function getPlanDefinition(plan: PlanId): PlanDefinition {
  if (!plan) return PLAN_DEFINITIONS.go;
  return PLAN_DEFINITIONS[plan] ?? PLAN_DEFINITIONS.go;
}

export function hasFeature(plan: PlanId, feature: keyof PlanFeatures): boolean {
  return getPlanLimits(plan).features[feature];
}

export function canAddResident(plan: PlanId, currentCount: number): boolean {
  return currentCount < getPlanLimits(plan).maxResidents;
}

export function upgradeMessage(plan: PlanId): string {
  if (!plan) return PLAN_UPGRADE_MESSAGE.go;
  return PLAN_UPGRADE_MESSAGE[plan] ?? "";
}

export function formatPlanPrice(cents: number | null): string {
  if (cents === null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
