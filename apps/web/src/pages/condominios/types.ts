export type Condominio = {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  zip_code?: string | null;
  neighborhood?: string | null;
  number?: string | null;
  reference?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  manager_email?: string | null;
  management_company?: string | null;
  management_contact_name?: string | null;
  management_contact_phone?: string | null;
  management_contact_email?: string | null;
  plan?: string | null;
};

export type PlanOption = { id: string; name: string; price: string };

export const PLANS: PlanOption[] = [
  { id: "go",    name: "OmniGO",    price: "R$ 109,99/mês" },
  { id: "plus",  name: "Omni+",     price: "R$ 169,99/mês" },
  { id: "ultra", name: "OmniUltra", price: "Sob consulta"  },
];

export type FormState = {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  active: boolean;
  zip_code: string;
  neighborhood: string;
  number: string;
  reference: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  management_company: string;
  management_contact_name: string;
  management_contact_phone: string;
  management_contact_email: string;
  plan: string;
};

export function emptyForm(): FormState {
  return {
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
    active: true,
    zip_code: "",
    neighborhood: "",
    number: "",
    reference: "",
    manager_name: "",
    manager_phone: "",
    manager_email: "",
    management_company: "",
    management_contact_name: "",
    management_contact_phone: "",
    management_contact_email: "",
    plan: "",
  };
}
