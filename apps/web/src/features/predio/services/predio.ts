export type ResidentStatus = "Proprietário" | "Inquilino" | "Vago" | "Visitante";

export type Resident = {
  name: string;
  email: string;
  phone: string;
  status: ResidentStatus;
};

export type Apartment = {
  id: string;
  number: string;
  floor: number;
  resident: Resident | null;
};

export type Floor = {
  level: number;
  apartments: Apartment[];
};

export function getMockBuilding(): Floor[] {
  const floors: Floor[] = [
    {
      level: 5,
      apartments: [
        { id: "501", number: "501", floor: 5, resident: { name: "Carlos Souza", email: "carlos.souza@example.com", phone: "(11) 99999-0001", status: "Proprietário" } },
        { id: "502", number: "502", floor: 5, resident: { name: "Mariana Silva", email: "mariana.silva@example.com", phone: "(11) 99999-0002", status: "Inquilino" } },
        { id: "503", number: "503", floor: 5, resident: null },
        { id: "504", number: "504", floor: 5, resident: { name: "Ricardo Gomes", email: "ricardo.gomes@example.com", phone: "(11) 99999-0004", status: "Proprietário" } },
      ],
    },
    {
      level: 4,
      apartments: [
        { id: "401", number: "401", floor: 4, resident: { name: "Patrícia Lima", email: "patricia.lima@example.com", phone: "(11) 99999-0011", status: "Inquilino" } },
        { id: "402", number: "402", floor: 4, resident: { name: "João Pereira", email: "joao.pereira@example.com", phone: "(11) 99999-0012", status: "Proprietário" } },
        { id: "403", number: "403", floor: 4, resident: null },
        { id: "404", number: "404", floor: 4, resident: { name: "Letícia Castro", email: "leticia.castro@example.com", phone: "(11) 99999-0014", status: "Visitante" } },
      ],
    },
    {
      level: 3,
      apartments: [
        { id: "301", number: "301", floor: 3, resident: { name: "Eduardo Ramos", email: "eduardo.ramos@example.com", phone: "(11) 99999-0021", status: "Proprietário" } },
        { id: "302", number: "302", floor: 3, resident: { name: "Ana Paula", email: "ana.paula@example.com", phone: "(11) 99999-0022", status: "Inquilino" } },
        { id: "303", number: "303", floor: 3, resident: null },
        { id: "304", number: "304", floor: 3, resident: { name: "Lucas Almeida", email: "lucas.almeida@example.com", phone: "(11) 99999-0024", status: "Proprietário" } },
      ],
    },
    {
      level: 2,
      apartments: [
        { id: "201", number: "201", floor: 2, resident: { name: "Fernanda Costa", email: "fernanda.costa@example.com", phone: "(11) 99999-0031", status: "Inquilino" } },
        { id: "202", number: "202", floor: 2, resident: { name: "Rafael Oliveira", email: "rafael.oliveira@example.com", phone: "(11) 99999-0032", status: "Proprietário" } },
        { id: "203", number: "203", floor: 2, resident: null },
        { id: "204", number: "204", floor: 2, resident: { name: "Carla Mendes", email: "carla.mendes@example.com", phone: "(11) 99999-0034", status: "Visitante" } },
      ],
    },
    {
      level: 1,
      apartments: [
        { id: "101", number: "101", floor: 1, resident: { name: "Gabriel Ferreira", email: "gabriel.ferreira@example.com", phone: "(11) 99999-0041", status: "Proprietário" } },
        { id: "102", number: "102", floor: 1, resident: { name: "Marisa Souza", email: "marisa.souza@example.com", phone: "(11) 99999-0042", status: "Inquilino" } },
        { id: "103", number: "103", floor: 1, resident: null },
        { id: "104", number: "104", floor: 1, resident: { name: "Renato Alves", email: "renato.alves@example.com", phone: "(11) 99999-0044", status: "Proprietário" } },
      ],
    },
  ]; 

  return floors;
}
