export const INITIAL_PATIENTS = [
    { id: 1, name: "Ana Paula Silva", phone: "(11) 98765-4321", email: "ana.silva@email.com", cpf: "123.456.789-00", address: "Rua das Flores, 123, São Paulo - SP", sessionsPerMonth: 4, valuePerSession: 200, since: "2023-03", status: "active", notes: "Ansiedade e síndrome do pânico.", family: [{ id: 1, name: "Carlos Silva", relation: "Cônjuge", phone: "(11) 91234-5678", email: "" }] },
    { id: 2, name: "João Mendes", phone: "(11) 99887-6543", email: "joao.mendes@email.com", cpf: "987.654.321-00", address: "Av. Paulista, 456, São Paulo - SP", sessionsPerMonth: 2, valuePerSession: 180, since: "2024-01", status: "active", notes: "", family: [] },
    { id: 3, name: "Maria Fernanda Costa", phone: "(21) 98765-0000", email: "mf.costa@email.com", cpf: "456.789.123-00", address: "Rua do Sol, 789, Rio de Janeiro - RJ", sessionsPerMonth: 4, valuePerSession: 220, since: "2023-11", status: "active", notes: "Acompanhamento pós-divórcio.", family: [{ id: 1, name: "Roberto Costa", relation: "Pai", phone: "(21) 97654-3210", email: "r.costa@email.com" }] },
    { id: 4, name: "Pedro Alves", phone: "(11) 94567-8901", email: "pedro.alves@email.com", cpf: "789.123.456-00", address: "Rua Nova, 321, São Paulo - SP", sessionsPerMonth: 2, valuePerSession: 150, since: "2024-04", status: "active", notes: "", family: [] },
    { id: 5, name: "Juliana Rocha", phone: "(11) 95432-1098", email: "j.rocha@email.com", cpf: "321.654.987-00", address: "Alameda das Rosas, 55, SP", sessionsPerMonth: 3, valuePerSession: 200, since: "2023-08", status: "inactive", notes: "Em pausa temporária.", family: [{ id: 1, name: "Lucia Rocha", relation: "Mãe", phone: "(11) 93210-9876", email: "" }] },
    { id: 6, name: "Carlos Eduardo Lima", phone: "(11) 96789-0123", email: "ce.lima@email.com", cpf: "654.321.098-77", address: "Rua do Ipê, 88, São Paulo - SP", sessionsPerMonth: 2, valuePerSession: 200, since: "2024-02", status: "active", notes: "", family: [] },
    { id: 7, name: "Beatriz Santos", phone: "(11) 97654-3210", email: "bia.santos@email.com", cpf: "111.222.333-44", address: "Rua das Palmeiras, 200, SP", sessionsPerMonth: 4, valuePerSession: 250, since: "2022-09", status: "active", notes: "Paciente de longa data.", family: [] },
    { id: 8, name: "Rafael Torres", phone: "(11) 92345-6789", email: "rafael.torres@email.com", cpf: "555.666.777-88", address: "Av. Brasil, 1000, São Paulo - SP", sessionsPerMonth: 1, valuePerSession: 180, since: "2024-03", status: "active", notes: "", family: [{ id: 1, name: "Sandra Torres", relation: "Cônjuge", phone: "(11) 91111-2222", email: "s.torres@email.com" }] },
];

export const INITIAL_PSYCHOLOGIST = {
    name: "Renata Oliveira",
    crp: "06/00000",
    cpf: "",
    cnpj: "",
    address: "",
    email: "",
    phone: "",
    specialty: "Psicologia Clínica",
};

export const MONTHLY_DATA = [
    { month: "Out", receita: 6800, custos: 2200 },
    { month: "Nov", receita: 7200, custos: 2200 },
    { month: "Dez", receita: 6400, custos: 2200 },
    { month: "Jan", receita: 7600, custos: 2400 },
    { month: "Fev", receita: 7800, custos: 2400 },
    { month: "Mar", receita: 8200, custos: 2400 },
    { month: "Abr", receita: 8600, custos: 2600 },
];
