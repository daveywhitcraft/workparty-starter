export const runtime = "nodejs"; // ensure server runtime on Vercel

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
};

export default async function AdminPage() {
  const authed = cookies().get("wp_admin_auth")?.value === "1";

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
            type="password"
            name="password"
            placeholder="Enter password"
            style={{ padding: "10px 12px", flex: 1 }}
            required
          />
          <button type="submit" style={{ padding: "10px 12px" }}>Login</button>
        </form>
      </div>
    );
  }

  // --- DATA FETCH ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srvKey = process.env.SUPABASE_SERVICE_ROLE || ""; // server-only key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // prefer service role; fall back to anon if missing
  const supabase = createClient(supabaseUrl, srvKey || anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data as Submission[]) || [];
  const publicBase = `${supabaseUrl}/storage/v1/object/public`;

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Admin</h1>
        <form action={logout}><button type="submit" style={{ fontSize: 14 }}>Log out</button></form>
      </div>

      {/* --- SIMPLE DIAGNOSTICS (visible on page to kill the guesswork) --- */}
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
        <div>Supabase URL set: {supabaseUrl ? "yes" : "no"}</div>
        <div>Service role present: {srvKey ? "yes" : "no"}</div>
        <div>Anon key present: {anonKey ? "yes" : "no"}</div>
        <div>Query error: {error ? error.message : "none"}</div>
        <div>Found submissions: {rows.length}</div>
      </div>

      {error ? (
        <p style={{ color: "crimson", marginTop: 12 }}>Error loading submissions: {error.message}</p>
      ) : rows.length === 0 ? (
        <p style={{ marginTop: 12 }}>No videos yet.</p>
      ) : (
        <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, marginTop: 16 }}>
          {rows.map((s) => {
            const bucket = s.storage_bucket || "videos";
            const path = s.file_path || "";
            const fileUrl = path ? `${publicBase}/${bucket}/${path}` : null;

            return (
              <li key={s.id} style={{ border: "1px solid #343434", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{s.title || path || s.id}</strong>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {new Date(s.created_at).toLocaleString()}
                      {s.status ? ` · ${s.status}` : ""}
                    </div>
                    {s.description ? (
                      <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{s.description}</p>
                    ) : null}
                  </div>
                  {fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noreferrer" style={{ alignSelf: "flex-start" }}>
                      Open file
                    </a>
                  ) : null}
                </div>

                {fileUrl ? (
                  <div style={{ marginTop: 12 }}>
                    <video controls preload="metadata" style={{ maxWidth: "100%", borderRadius: 6 }} src={fileUrl} />
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
