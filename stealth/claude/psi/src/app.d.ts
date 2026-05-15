// See https://kit.svelte.dev/docs/types#app
import type { SupabaseClient, User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
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
