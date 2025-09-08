export const runtime = "nodejs";
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";
import Player from "./Player";

type EventRow = { id: number; slug: string; title?: string | null; city?: string | null };

export default async function ScreenPage({ params }: { params: { slug: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, srv || anon, { auth: { persistSession: false } });

  const { data: evs } = await sb.from("events").select("*").eq("slug", params.slug).limit(1);
  if (!evs?.length) {
    return <main style={{ padding: 24 }}>Event not found.</main>;
  }
  const ev = evs[0] as EventRow;

  const { data: subs } = await sb
    .from("submissions")
    .select("*")
    .eq("event_id", ev.id)
    .in("status", ["approved", "archived"])
    .order("created_at", { ascending: false });

  return (
    <main style={{ background: "black", color: "white", minHeight: "100vh" }}>
      <div style={{ padding: "12px 16px" }}>
        <h1>{ev.title || ev.slug}</h1>
      </div>
      <Player items={subs || []} />
    </main>
  );
}
