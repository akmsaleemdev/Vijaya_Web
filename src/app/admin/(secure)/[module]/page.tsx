import { forbidden, notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentAdmin } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/modules";
import { AdminModule } from "@/components/admin/workspace";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/password");
  const { module } = await params;
  if (!Object.hasOwn(modules, module)) notFound();
  const name = module as keyof typeof modules;
  if (!modules[name].roles.some((role) => role === admin.role)) forbidden();
  return <><nav aria-label="Breadcrumb"><Link className="v-link" href="/admin">Administration</Link><span aria-current="page"> / {modules[name].label}</span></nav>
    <AdminModule module={name} role={admin.role} />
  </>;
}
