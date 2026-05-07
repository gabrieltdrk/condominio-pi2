export type PlanId = "go" | "plus" | "ultra" | null | undefined;

export type PlanLimits = {
  maxResidents: number;
  features: {
    avisos: boolean;
    financeiro: boolean;
    agendamentos: boolean;
    ocorrencias: boolean;
    relatoriosFinanceiros: boolean;
    suportePrioritario: boolean;
    relatoriosAvancados: boolean;
    suporteDedicado: boolean;
  };
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  go: {
    maxResidents: 20,
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
    maxResidents: 100,
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
    maxResidents: Infinity,
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

export const PLAN_LABELS: Record<string, string> = {
  go: "OmniGO",
  plus: "Omni+",
  ultra: "OmniUltra",
};

export const PLAN_UPGRADE_MESSAGE: Record<string, string> = {
  go: "Faça upgrade para o Omni+ ou OmniUltra para acessar este recurso.",
  plus: "Faça upgrade para o OmniUltra para acessar este recurso.",
  ultra: "",
};

export function getPlanLimits(plan: PlanId): PlanLimits {
  if (!plan) return PLAN_LIMITS.go;
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.go;
}

export function hasFeature(plan: PlanId, feature: keyof PlanLimits["features"]): boolean {
  return getPlanLimits(plan).features[feature];
}

export function canAddResident(plan: PlanId, currentCount: number): boolean {
  return currentCount < getPlanLimits(plan).maxResidents;
}

export function upgradeMessage(plan: PlanId): string {
  if (!plan) return PLAN_UPGRADE_MESSAGE.go;
  return PLAN_UPGRADE_MESSAGE[plan] ?? "";
}
