export type Clinic = { id: string; name: string; owner_id: string };
export type Patient = {
  id: string;
  clinic_id: string;
  name: string;
  cpf?: string;
};
export type AIUsageLog = {
  id: string;
  clinic_id: string;
  type: "llm" | "tts";
  provider: string;
  characters_tts?: number;
  cost_estimate: number;
  created_at: Date;
};
