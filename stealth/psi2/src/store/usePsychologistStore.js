import { create } from "zustand";
import { INITIAL_PSYCHOLOGIST } from "../api/mockData";

export const usePsychologistStore = create((set) => ({
    psychologist: INITIAL_PSYCHOLOGIST,
    updatePsychologist: (updated) => set({ psychologist: updated }),
}));
