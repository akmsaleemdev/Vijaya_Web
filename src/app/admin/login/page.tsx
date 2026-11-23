import Image from "next/image";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { AdminLogin } from "@/components/admin/auth-forms";

export default async function LoginPage() {
  const admin = await currentAdmin();
  if (admin) redirect(admin.mustChangePassword ? "/admin/password" : "/admin");
  return <main className="v-auth">
    <div className="v-panel v-stack">
      <Image src="/brand/vijaya-logo-burgundy.png" width={146} height={54} alt="VIJAYA" unoptimized />
      <div className="v-stack"><h1>Administration</h1><p className="v-muted">Sign in to manage the VIJAYA website and bookings.</p></div>
      <AdminLogin />
    </div>
  </main>;
}
