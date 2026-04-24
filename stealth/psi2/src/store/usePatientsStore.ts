import { create } from "zustand";
import { INITIAL_PATIENTS } from "../api/mockData";

export type RelativeRelationship =
  | "filho"
  | "filha"
  | "cônjuge"
  | "companheiro"
  | "pai"
  | "mãe"
  | "irmão"
  | "irmã"
  | "tio"
  | "tia"
  | "avô"
  | "avó"
  | "outro";

export const RELATIVE_RELATIONSHIPS: RelativeRelationship[] = [
  "filho",
  "filha",
  "cônjuge",
  "companheiro",
  "pai",
  "mãe",
  "irmão",
  "irmã",
  "tio",
  "tia",
  "avô",
  "avó",
  "outro",
];

export type PatientRelative = {
  id: number;
  name: string;
  relationship: RelativeRelationship;
  phone?: string;
  email?: string;
  notes?: string;
};

export type PatientAddress = {
  street?: string;
  number?: string;
  complement?: string;
  zip?: string;
  city?: string;
  state?: string;
};

export type Patient = {
  id: number;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  address?: PatientAddress;
  sessionsPerMonth: number;
  valuePerSession: number;
  since: string;
  status: string;
  notes: string;
  relatives: PatientRelative[];
};

export type PatientsStore = {
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  updatePatient: (updated: Patient) => void;
  addPatient: (newPatient: Omit<Patient, "id">) => void;
  getPatientById: (id: number) => Patient | undefined;
};

export const usePatientsStore = create<PatientsStore>((set, get) => ({
  patients: INITIAL_PATIENTS as Patient[],
  setPatients: (patients) => set({ patients }),
  updatePatient: (updated) =>
    set((state) => ({
      patients: state.patients.map((p) => (p.id === updated.id ? updated : p)),
    })),
  addPatient: (newPatient) =>
    set((state) => ({
      patients: [...state.patients, { ...newPatient, id: Date.now() }],
    })),
  getPatientById: (id) => get().patients.find((p) => p.id === id),
}));
