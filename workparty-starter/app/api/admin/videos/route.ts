import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase.storage
    .from("submissions")
    .list("", { limit: 1000 });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paths = data?.map((f) => f.name) || [];
  const { data: signed } = await supabase.storage
    .from("submissions")
    .createSignedUrls(paths, 3600);

  return NextResponse.json({ items: signed });
}
