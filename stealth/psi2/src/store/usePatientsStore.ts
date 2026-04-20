import { create } from "zustand";
import { INITIAL_PATIENTS } from "../api/mockData";

export const usePatientsStore = create((set, get) => ({
  patients: INITIAL_PATIENTS,
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
