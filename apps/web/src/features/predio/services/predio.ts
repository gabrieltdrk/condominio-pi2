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
  tower: string;
  apartments: Apartment[];
};

export function getMockBuilding(): Floor[] {
  const floors: Floor[] = [
    {
      tower: "Torre A",
      level: 5,
      apartments: [
        { id: "A-501", number: "501", floor: 5, resident: { name: "Carlos Souza", email: "carlos.souza@example.com", phone: "(11) 99999-0001", status: "Proprietário" } },
        { id: "A-502", number: "502", floor: 5, resident: { name: "Mariana Silva", email: "mariana.silva@example.com", phone: "(11) 99999-0002", status: "Inquilino" } },
        { id: "A-503", number: "503", floor: 5, resident: null },
        { id: "A-504", number: "504", floor: 5, resident: { name: "Ricardo Gomes", email: "ricardo.gomes@example.com", phone: "(11) 99999-0004", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre A",
      level: 4,
      apartments: [
        { id: "A-401", number: "401", floor: 4, resident: { name: "Patrícia Lima", email: "patricia.lima@example.com", phone: "(11) 99999-0011", status: "Inquilino" } },
        { id: "A-402", number: "402", floor: 4, resident: { name: "João Pereira", email: "joao.pereira@example.com", phone: "(11) 99999-0012", status: "Proprietário" } },
        { id: "A-403", number: "403", floor: 4, resident: null },
        { id: "A-404", number: "404", floor: 4, resident: { name: "Letícia Castro", email: "leticia.castro@example.com", phone: "(11) 99999-0014", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre A",
      level: 3,
      apartments: [
        { id: "A-301", number: "301", floor: 3, resident: { name: "Eduardo Ramos", email: "eduardo.ramos@example.com", phone: "(11) 99999-0021", status: "Proprietário" } },
        { id: "A-302", number: "302", floor: 3, resident: { name: "Ana Paula", email: "ana.paula@example.com", phone: "(11) 99999-0022", status: "Inquilino" } },
        { id: "A-303", number: "303", floor: 3, resident: null },
        { id: "A-304", number: "304", floor: 3, resident: { name: "Lucas Almeida", email: "lucas.almeida@example.com", phone: "(11) 99999-0024", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre A",
      level: 2,
      apartments: [
        { id: "A-201", number: "201", floor: 2, resident: { name: "Fernanda Costa", email: "fernanda.costa@example.com", phone: "(11) 99999-0031", status: "Inquilino" } },
        { id: "A-202", number: "202", floor: 2, resident: { name: "Rafael Oliveira", email: "rafael.oliveira@example.com", phone: "(11) 99999-0032", status: "Proprietário" } },
        { id: "A-203", number: "203", floor: 2, resident: null },
        { id: "A-204", number: "204", floor: 2, resident: { name: "Carla Mendes", email: "carla.mendes@example.com", phone: "(11) 99999-0034", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre A",
      level: 1,
      apartments: [
        { id: "A-101", number: "101", floor: 1, resident: { name: "Gabriel Ferreira", email: "gabriel.ferreira@example.com", phone: "(11) 99999-0041", status: "Proprietário" } },
        { id: "A-102", number: "102", floor: 1, resident: { name: "Marisa Souza", email: "marisa.souza@example.com", phone: "(11) 99999-0042", status: "Inquilino" } },
        { id: "A-103", number: "103", floor: 1, resident: null },
        { id: "A-104", number: "104", floor: 1, resident: { name: "Renato Alves", email: "renato.alves@example.com", phone: "(11) 99999-0044", status: "Proprietário" } },
      ],
    },

    {
      tower: "Torre B",
      level: 5,
      apartments: [
        { id: "B-501", number: "501", floor: 5, resident: { name: "Juliana Rocha", email: "juliana.rocha@example.com", phone: "(11) 98888-0001", status: "Inquilino" } },
        { id: "B-502", number: "502", floor: 5, resident: null },
        { id: "B-503", number: "503", floor: 5, resident: { name: "Thiago Martins", email: "thiago.martins@example.com", phone: "(11) 98888-0003", status: "Proprietário" } },
        { id: "B-504", number: "504", floor: 5, resident: { name: "Beatriz Nunes", email: "beatriz.nunes@example.com", phone: "(11) 98888-0004", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre B",
      level: 4,
      apartments: [
        { id: "B-401", number: "401", floor: 4, resident: { name: "Felipe Barros", email: "felipe.barros@example.com", phone: "(11) 98888-0011", status: "Proprietário" } },
        { id: "B-402", number: "402", floor: 4, resident: null },
        { id: "B-403", number: "403", floor: 4, resident: { name: "Larissa Melo", email: "larissa.melo@example.com", phone: "(11) 98888-0013", status: "Inquilino" } },
        { id: "B-404", number: "404", floor: 4, resident: { name: "André Luiz", email: "andre.luiz@example.com", phone: "(11) 98888-0014", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre B",
      level: 3,
      apartments: [
        { id: "B-301", number: "301", floor: 3, resident: null },
        { id: "B-302", number: "302", floor: 3, resident: { name: "Priscila Campos", email: "priscila.campos@example.com", phone: "(11) 98888-0022", status: "Visitante" } },
        { id: "B-303", number: "303", floor: 3, resident: { name: "Murilo Freitas", email: "murilo.freitas@example.com", phone: "(11) 98888-0023", status: "Inquilino" } },
        { id: "B-304", number: "304", floor: 3, resident: { name: "Vanessa Duarte", email: "vanessa.duarte@example.com", phone: "(11) 98888-0024", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre B",
      level: 2,
      apartments: [
        { id: "B-201", number: "201", floor: 2, resident: { name: "Sérgio Teixeira", email: "sergio.teixeira@example.com", phone: "(11) 98888-0031", status: "Proprietário" } },
        { id: "B-202", number: "202", floor: 2, resident: null },
        { id: "B-203", number: "203", floor: 2, resident: { name: "Camila Prado", email: "camila.prado@example.com", phone: "(11) 98888-0033", status: "Inquilino" } },
        { id: "B-204", number: "204", floor: 2, resident: { name: "Igor Santos", email: "igor.santos@example.com", phone: "(11) 98888-0034", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre B",
      level: 1,
      apartments: [
        { id: "B-101", number: "101", floor: 1, resident: { name: "Helena Moraes", email: "helena.moraes@example.com", phone: "(11) 98888-0041", status: "Proprietário" } },
        { id: "B-102", number: "102", floor: 1, resident: { name: "Otávio Ribeiro", email: "otavio.ribeiro@example.com", phone: "(11) 98888-0042", status: "Inquilino" } },
        { id: "B-103", number: "103", floor: 1, resident: null },
        { id: "B-104", number: "104", floor: 1, resident: { name: "Bianca Leal", email: "bianca.leal@example.com", phone: "(11) 98888-0044", status: "Proprietário" } },
      ],
    },
  ];

  return floors;
}