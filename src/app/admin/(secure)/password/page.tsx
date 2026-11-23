import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { PasswordForm } from "@/components/admin/auth-forms";

export default async function PasswordPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return <section className="v-panel v-stack max-w-xl">
    <h1>Change password</h1>
    <p className="v-muted">{admin.mustChangePassword ? "Choose a new password before opening the admin panel." : "Changing your password ends all current sessions."}</p>
    <PasswordForm />
  </section>;
}
