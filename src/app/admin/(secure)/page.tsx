import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { AdminModule } from "@/components/admin/workspace";

export default async function AdminIndex() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/password");
  if (admin.role === "EDITOR") redirect("/admin/content");
  return <AdminModule module="dashboard" role={admin.role} />;
}
