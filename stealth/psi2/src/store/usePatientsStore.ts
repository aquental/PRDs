import { create } from "zustand";
import { INITIAL_PATIENTS } from "../api/mockData";

export type FamilyMember = {
  id: number;
  name: string;
  relation: string;
  phone: string;
  email: string;
};

export type Patient = {
  id: number;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  address: string;
  sessionsPerMonth: number;
  valuePerSession: number;
  since: string;
  status: string;
  notes: string;
  family: FamilyMember[];
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
