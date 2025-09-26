// app/events/[slug]/screen/page.tsx
export const runtime = "nodejs";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabaseServer";
import Player from "./Player";

type EventRow = {
  id: number;
  slug: string;
  title: string | null;
  city: string | null;
  start_at: string | null;
};

type Submission = {
  id: string;
  created_at: string;
  title?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
  event_id?: number | null;
  meta?: { order_index?: number | string | null } | null;
};

type PageProps = { params: { slug: string } };

async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const db = supabaseService();
  const { data } = await db
    .from("events")
    .select("id, slug, title, city, start_at")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle<EventRow>();
  return data ?? null;
}

async function getEventSubmissions(eventId: number): Promise<Submission[]> {
  const db = supabaseService();
  const { data, error } = await db
    .from("submissions")
    .select(
      "id, created_at, title, status, event_id, storage_bucket, file_path, meta"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Submission[];
}

function toOrderIndex(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number | undefined);
  return Number.isFinite(n) ? (n as number) : Number.POSITIVE_INFINITY;
}

export default async function ScreenPage({ params }: PageProps) {
  const event = await getEventBySlug(params.slug);
  if (!event) return notFound();

  const subs = await getEventSubmissions(event.id);

  // Minimal, safe filter: any row with a stored file plays
  const playable = subs.filter((s) => s.storage_bucket && s.file_path);

  // Enforce Admin order_index: 1,2,3…; stable fallbacks keep previous behavior
  const playableSorted = playable.slice().sort((a, b) => {
    const ai = toOrderIndex(a.meta?.order_index ?? null);
    const bi = toOrderIndex(b.meta?.order_index ?? null);
    if (ai !== bi) return ai - bi;
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    if (at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });

  const items = playableSorted.map((s, idx) => ({
    id: s.id,
    title: s.title ?? `#${idx + 1}`,
    bucket: s.storage_bucket!,
    path: s.file_path!,
  }));

  if (items.length === 0) {
    return (
      <section style={{ padding: 24 }}>
        <div style={{ maxWidth: 800 }}>
          <h1 style={{ margin: 0 }}>{event.title ?? "Screening"}</h1>
          <p style={{ marginTop: 12 }}>No videos found for this event.</p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: 0 }}>
      <Player items={items} />
    </section>
  );
}
