export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Submission = {
  id: string;
  created_at: string;
  title?: string | null;
  description?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
  event_id?: number | null;
};

type EventRow = {
  id: number;
  slug: string;
  city?: string | null;
  title?: string | null;
};

type Props = { searchParams?: { status?: string; event?: string } };

export default async function AdminPage({ searchParams }: Props) {
  const authed = cookies().get("wp_admin_auth")?.value === "1";
  const activeStatus = (searchParams?.status || "all").toLowerCase();
  const eventFilter = searchParams?.event ? Number(searchParams.event) : null;

  // ---------- Auth ----------
  async function login(formData: FormData) {
    "use server";
    const pwd = String(formData.get("password") || "");
    if (pwd === process.env.ADMIN_PASS) {
      cookies().set("wp_admin_auth", "1", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    redirect("/admin");
  }

  async function logout() {
    "use server";
    cookies().delete("wp_admin_auth");
    redirect("/admin");
  }

  if (!authed) {
    return (
      <div style={{ padding: 24, maxWidth: 520 }}>
        <h1>Admin Login</h1>
        <form action={login} style={{ display: "flex", gap: 8 }}>
          <input
            name="password"
            type="password"
            placeholder="Enter password"
            style={{ padding: 10, flex: 1 }}
            required
          />
          <button type="submit" style={{ padding: "10px 12px" }}>
            Login
          </button>
        </form>
      </div>
    );
  }

  // ---------- Supabase ----------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, srv || anon, { auth: { persistSession: false } });

  // Actions
  async function setStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "");
    if (id && status) {
      const sb2 = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE || "",
        { auth: { persistSession: false } }
      );
      await sb2.from("submissions").update({ status }).eq("id", id);
    }
    redirect(
      `/admin?status=${encodeURIComponent(activeStatus)}${
        eventFilter ? `&event=${eventFilter}` : ""
      }`
    );
  }

  // Fetch events for filter
  const { data: evs } = await sb
    .from("events")
    .select("id, slug, city, title")
    .order("start_at", { ascending: false });
  const allEvents: EventRow[] = evs || [];

  // Fetch submissions
  let q = sb.from("submissions").select("*").order("created_at", {
    ascending: false,
  });
  if (["pending", "approved", "archived"].includes(activeStatus)) {
    q = q.eq("status", activeStatus);
  }
  if (eventFilter) {
    q = q.eq("event_id", eventFilter);
  }
  const { data, error } = await q;
  const rows = (data as Submission[]) || [];

  // Buckets
  const { data: bucketList } = await sb.storage.listBuckets();
  const bucketNames = new Set((bucketList || []).map((b) => b.name));

  function ext(path: string) {
    const i = path.lastIndexOf(".");
    return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
  }
  function guessType(path: string) {
    const e = ext(path);
    if (["mp4", "m4v", "mov", "webm", "mkv", "avi"].includes(e)) return "video";
    if (["mp3", "wav", "aac", "m4a", "flac", "ogg"].includes(e)) return "audio";
    if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(e)) return "image";
    return "file";
  }

  const items = await Promise.all(
    rows.map(async (s) => {
      const candidates = [s.storage_bucket || "", "videos", "submissions", "public"].filter(
        Boolean
      ) as string[];
      let bucket = candidates.find((n) => bucketNames.has(n)) || "";
      if (!bucket && bucketList && bucketList.length)
        bucket = bucketList[0].name;

      let signedUrl: string | null = null;
      let urlErr: string | null = null;
      if (bucket && s.file_path) {
        const { data: signed, error: e } = await sb.storage
          .from(bucket)
          .createSignedUrl(s.file_path, 60 * 60 * 12);
        if (e) urlErr = e.message;
        else signedUrl = signed?.signedUrl || null;
      } else {
        urlErr = "missing bucket or path";
      }

      return {
        ...s,
        uiType: s.file_path ? guessType(s.file_path) : "file",
        bucketUsed: bucket,
        fileUrl: signedUrl,
        urlErr,
      };
    })
  );

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h1>Admin</h1>
        <form action={logout}>
          <button type="submit" style={{ fontSize: 14 }}>
            Log out
          </button>
        </form>
      </div>

      {/* Status filter */}
      <nav style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 14 }}>
        {["all", "pending", "approved", "archived"].map((s) => (
          <a
            key={s}
            href={`/admin?status=${s}${eventFilter ? `&event=${eventFilter}` : ""}`}
            style={{ textDecoration: activeStatus === s ? "underline" : "none" }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </a>
        ))}
      </nav>

      {/* Event filter */}
      <form method="get" style={{ marginTop: 12, marginBottom: 12 }}>
        <input type="hidden" name="status" value={activeStatus} />
        <label style={{ fontSize: 14, marginRight: 8 }}>Event:</label>
        <select
          name="event"
          defaultValue={eventFilter || ""}
          onChange={(e) => e.currentTarget.form?.submit()}
        >
          <option value="">All</option>
          {allEvents.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title || ev.slug} {ev.city ? `— ${ev.city}` : ""}
            </option>
          ))}
        </select>
      </form>

      {error ? (
        <p style={{ color: "crimson", marginTop: 12 }}>Error: {error.message}</p>
      ) : items.length === 0 ? (
        <p style={{ marginTop: 12 }}>No submissions.</p>
      ) : (
        <ul
          style={{
            display: "grid",
            gap: 12,
            listStyle: "none",
            padding: 0,
            marginTop: 16,
          }}
        >
          {items.map((s) => (
            <li
              key={s.id}
              style={{
                border: "1px solid #343434",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <strong>{s.title || s.file_path || s.id}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {new Date(s.created_at).toLocaleString()}
                    {s.status ? ` · ${s.status}` : ""}
                  </div>
                  {s.description ? (
                    <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                      {s.description}
                    </p>
                  ) : null}
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.6,
                      marginTop: 4,
                    }}
                  >
                    bucket: {s.bucketUsed || "unknown"} · path:{" "}
                    {s.file_path || "none"}
                    {s.urlErr ? ` · url error: ${s.urlErr}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <form action={setStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button type="submit" style={{ fontSize: 12 }}>Approve</button>
                  </form>
                  <form action={setStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="archived" />
                    <button type="submit" style={{ fontSize: 12 }}>Archive</button>
                  </form>
                  <form action={setStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="pending" />
                    <button type="submit" style={{ fontSize: 12 }}>Pending</button>
                  </form>
                </div>
              </div>

              {/* Preview */}
              <div style={{ marginTop: 12 }}>
                {s.fileUrl ? (
                  <>
                    {s.uiType === "video" && (
                      <video
                        controls
                        preload="metadata"
                        style={{ maxWidth: "100%", borderRadius: 6 }}
                        src={s.fileUrl}
                      />
                    )}
                    {s.uiType === "audio" && (
                      <audio controls style={{ width: "100%" }} src={s.fileUrl} />
                    )}
                    {s.uiType === "image" && (
                      <img
                        alt={s.title || s.file_path || ""}
                        style={{ maxWidth: "100%", borderRadius: 6 }}
                        src={s.fileUrl}
                      />
                    )}
                    {s.uiType === "file" && (
                      <p style={{ fontSize: 12, opacity: 0.8 }}>
                        Preview not supported in-browser; use Open file.
                      </p>
                    )}
                    <div style={{ marginTop: 6 }}>
                      <a href={s.fileUrl} target="_blank" rel="noreferrer">
                        Open file
                      </a>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: "crimson" }}>
                    File URL unavailable.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
