export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Submission = {
  id: string;
  created_at: string;
  title?: string | null;
  description?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
};

type Props = { searchParams?: { status?: string } };

export default async function AdminPage({ searchParams }: Props) {
  const authed = cookies().get("wp_admin_auth")?.value === "1";
  const activeStatus = (searchParams?.status || "all").toLowerCase();

  // --- Auth using your ADMIN_PASS (no new files) ---
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
          <input name="password" type="password" placeholder="Enter password" style={{ padding: 10, flex: 1 }} required />
          <button type="submit" style={{ padding: "10px 12px" }}>Login</button>
        </form>
      </div>
    );
  }

  // --- Supabase (server) ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srvKey = process.env.SUPABASE_SERVICE_ROLE || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, srvKey || anonKey, { auth: { persistSession: false } });
  const publicBase = `${supabaseUrl}/storage/v1/object/public`;

  // --- Status actions ---
  async function setStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE || "", {
      auth: { persistSession: false },
    });
    if (id && status) await sb.from("submissions").update({ status }).eq("id", id);
    redirect(`/admin?status=${encodeURIComponent(activeStatus)}`);
  }

  // --- Query with optional filter ---
  let query = supabase.from("submissions").select("*").order("created_at", { ascending: false });
  if (["pending", "approved", "archived"].includes(activeStatus)) query = query.eq("status", activeStatus);
  const { data, error } = await query;
  const rows = (data as Submission[]) || [];

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Admin</h1>
        <form action={logout}><button type="submit" style={{ fontSize: 14 }}>Log out</button></form>
      </div>

      {/* Filters */}
      <nav style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 14 }}>
        {["all", "pending", "approved", "archived"].map((s) => (
          <Link key={s} href={`/admin?status=${s}`} style={{ textDecoration: activeStatus === s ? "underline" : "none" }}>
            {s[0].toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </nav>

      {error ? (
        <p style={{ color: "crimson", marginTop: 12 }}>Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p style={{ marginTop: 12 }}>No videos.</p>
      ) : (
        <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, marginTop: 16 }}>
          {rows.map((s) => {
            const bucket = s.storage_bucket || "videos";
            const path = s.file_path || "";
            const fileUrl = path ? `${publicBase}/${bucket}/${path}` : null;
            const lower = (path || "").toLowerCase();
            const playable = lower.endsWith(".mp4") || lower.endsWith(".webm"); // reliable inline preview types

            return (
              <li key={s.id} style={{ border: "1px solid #343434", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{s.title || path || s.id}</strong>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {new Date(s.created_at).toLocaleString()}
                      {s.status ? ` · ${s.status}` : ""}
                    </div>
                    {s.description ? <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{s.description}</p> : null}
                  </div>

                  {/* Status buttons */}
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
                {fileUrl ? (
                  <div style={{ marginTop: 12 }}>
                    {playable ? (
                      <video controls preload="metadata" style={{ maxWidth: "100%", borderRadius: 6 }} src={fileUrl} />
                    ) : (
                      <p style={{ fontSize: 12, opacity: 0.75 }}>
                        Preview available for MP4/WebM. Use “Open file” to view this format.
                      </p>
                    )}
                    <div style={{ marginTop: 6 }}>
                      <a href={fileUrl} target="_blank" rel="noreferrer">Open file</a>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
