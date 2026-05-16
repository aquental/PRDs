// See https://kit.svelte.dev/docs/types#app
import type { SupabaseClient, User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      // NOTE: SupabaseClient is left untyped here due to a generic-parameter
      // incompatibility between @supabase/ssr@0.5.x (old 3-param form) and
      // @supabase/supabase-js@2.104+ (new 3-param form with different semantics).
      // Type-safe access is available via createSupabaseServerClient(event) directly.
      supabase: SupabaseClient;
      safeGetSession: () => Promise<{
        user: User | null;
      }>;
    }
    interface PageData {
      user: User | null;
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {};
