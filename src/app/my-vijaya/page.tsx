import { pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { PortalLogin } from "@/components/portal/portal-login";

const metadata: Metadata = {
  title: "My VIJAYA — Sign In",
  description: "Access your VIJAYA booking — payments, documents, event plan and support.",
};

export default async function PortalLoginPage() {
  const session = await getPortalSession();
  if (session) redirect("/my-vijaya/dashboard");

  return (
    <main className="flex-1 flex items-center justify-center py-16 md:py-24">
      <div className="container-editorial max-w-lg">
        <PortalLogin />
      </div>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("my-vijaya", metadata);
