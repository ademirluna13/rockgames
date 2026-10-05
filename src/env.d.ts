/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    admin?: import("./lib/admin/auth").AdminIdentity;
    adminClient?: import("@supabase/supabase-js").SupabaseClient;
  }
}
