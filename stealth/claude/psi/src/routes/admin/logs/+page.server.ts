import type { PageServerLoad } from "./$types";
import { createSupabaseAdminClient } from "$lib/supabase/server";
import { aggregateUsage } from "$core/ai-logger";
import type { AIUsageLog } from "$core/types";
import type { Database } from "$lib/supabase/database.types";

type AICallType = Database["public"]["Enums"]["ai_call_type"];

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
  const admin = createSupabaseAdminClient();

  // ── Filter params from URL ────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const from = url.searchParams.get("from") ?? thirtyDaysAgo;
  const to = url.searchParams.get("to") ?? today;
  const callType = url.searchParams.get("type") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const therapistId = url.searchParams.get("therapist") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const fromISO = `${from}T00:00:00.000Z`;
  const toISO = `${to}T23:59:59.999Z`;

  // ── Paginated logs query ──────────────────────────────────────────────────
  let logsQuery = admin
    .from("ai_usage_logs")
    .select("*", { count: "exact" })
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (callType) logsQuery = logsQuery.eq("call_type", callType as AICallType);
  if (status) logsQuery = logsQuery.eq("status", status);
  if (therapistId) logsQuery = logsQuery.eq("therapist_id", therapistId);

  // ── Aggregate query (light projection, capped at 5 000 rows) ─────────────
  let aggQuery = admin
    .from("ai_usage_logs")
    .select("call_type, input_tokens, output_tokens, characters, cost_usd")
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .limit(5000);

  if (callType) aggQuery = aggQuery.eq("call_type", callType as AICallType);
  if (status) aggQuery = aggQuery.eq("status", status);
  if (therapistId) aggQuery = aggQuery.eq("therapist_id", therapistId);

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [{ data: logs, count }, { data: aggLogs }, { data: therapists }] =
    await Promise.all([
      logsQuery,
      aggQuery,
      admin.from("therapists").select("id, name").order("name"),
    ]);

  const therapistMap: Record<string, string> = Object.fromEntries(
    (therapists ?? []).map((t) => [t.id, t.name as string]),
  );

  const usage = aggregateUsage((aggLogs ?? []) as AIUsageLog[]);
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return {
    logs: (logs ?? []) as AIUsageLog[],
    count: count ?? 0,
    page,
    totalPages,
    filters: { from, to, callType, status, therapistId },
    usage,
    therapistMap,
    therapistList: (therapists ?? []) as { id: string; name: string }[],
  };
};
