import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !serviceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey
);

// Recursively list all files (skip folders)
async function listAll(prefix = ""): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from("submissions")
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error) throw error;

  const out: string[] = [];
  for (const item of data || []) {
    // Folders have no id; files have an id
    // @ts-ignore
    if (item.id) {
      out.push(`${prefix}${item.name}`);
    } else {
      out.push(...(await listAll(`${prefix}${item.name}/`)));
    }
  }
  return out;
}

export async function GET() {
  try {
    const paths = await listAll("");
    if (!paths.length) return NextResponse.json({ items: [] });

    const { data: signed, error } = await supabase.storage
      .from("submissions")
      .createSignedUrls(paths, 3600);

    if (error) throw error;

    return NextResponse.json({
      items: (signed || []).map((s, i) => ({
        path: paths[i],
        signedUrl: s.signedUrl,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "list failed" }, { status: 500 });
  }
}
