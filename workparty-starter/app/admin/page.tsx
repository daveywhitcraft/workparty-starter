import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const authed = cookies().get("wp_admin_auth")?.value === "1";
  const envSet = !!process.env.ADMIN_PASS; // quick check that the server sees it

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
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
          Server sees ADMIN_PASS: {envSet ? "yes" : "no"}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Admin</h1>
        <form action={logout}>
          <button type="submit" style={{ fontSize: 14 }}>Log out</button>
        </form>
      </div>
      <p>Welcome.</p>
    </div>
  );
}
