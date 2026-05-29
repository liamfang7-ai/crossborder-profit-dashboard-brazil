import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL，请在 Vercel 环境变量中配置 Supabase URL。");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "缺少 SUPABASE_SERVICE_ROLE_KEY，请在 Vercel 环境变量中配置 Supabase service role key。",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
