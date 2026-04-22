import { supabase } from "$lib/supabase/server";

export async function logAIUsage(log: {
  clinic_id: string;
  type: "llm" | "tts";
  provider: string;
  characters_tts?: number;
  cost_estimate: number;
}) {
  await supabase.from("ai_usage_logs").insert([log]);
}
