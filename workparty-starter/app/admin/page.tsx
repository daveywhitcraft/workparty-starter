import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Submission = {
  id: string;
  created_at: string;
  title?: string | null;
  description?: string | null;
  file_path?: string | null;      // e.g. "artist123/myvideo.mp4"
  storage_bucket?: string | null; // e.g. "videos"
  status?: string | null;
};

export default async function AdminPage() {
  const authed = cookies().get("wp_admin_auth")?.value === "1";

  // ---- server-side login using your ADMIN_PASS (no client envs) ----
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

  // ---- show login form if not authed ----
  if (!authed) {
    return (
      <div style={{ padding: "2rem", maxWidth: 520 }}>
        <h1>Admin Login</h1>
        <form action={login} style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            style={{ padding: "0.6rem 0.8rem", flex: 1 }}
            required
          />
          <button type="submit" style={{ padding: "0.6rem 0.9rem" }}>Login</button>
        </form>
      </div>
    );
  }

  // ---- fetch submissions on the server (uses your Supabase envs) ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseSrv = process.env.SUPABASE_SERVICE_ROLE || ""; // server-only key
  const supabase = createClient(supabaseUrl, supabaseSrv);

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data as Submission[]) || [];
  const publicBase = `${supabaseUrl}/storage/v1/object/public`;

  return (
    <div style={{ padding: "2rem", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Admin</h1>
        <form action={logout}><button type="submit" style={{ fontSize: 14 }}>Log out</button></form>
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
                    <video controls preload="metadata" style={{ maxWidth: "100%", borderRadius: 6 }} src={fileUrl}
