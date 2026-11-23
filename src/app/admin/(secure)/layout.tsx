import Link from "next/link";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { currentAdmin } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/modules";
import { AdminNavigation } from "@/components/admin/navigation";
import { Logout } from "@/components/admin/auth-forms";

export default async function SecureAdmin({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const links = Object.entries(modules).flatMap(([name, module]) =>
    !admin.mustChangePassword && module.roles.some((role) => role === admin.role) ? [{ path: name === "dashboard" ? "/admin" : `/admin/${name}`, label: module.label }] : [],
  );
  return <div className="v-shell">
    <aside className="v-sidebar v-stack content-start">
      <Link href="/admin" className="text-base font-semibold tracking-widest">VIJAYA</Link>
      {links.length > 0 && <AdminNavigation links={links} />}
    </aside>
    <main className="v-main v-stack">
      <header className="v-row justify-between">
        <div><span className="font-semibold">{admin.name}</span><span className="v-muted ml-3">{admin.role.replaceAll("_", " ")}</span></div>
        <div className="v-row"><Link className="v-button" href="/admin/password">Password</Link><Logout /></div>
      </header>
      {children}
    </main>
    <Toaster richColors />
  </div>;
}
