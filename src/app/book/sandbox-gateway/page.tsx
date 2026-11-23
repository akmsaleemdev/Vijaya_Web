import { notFound } from "next/navigation";
import { bookingMode } from "@/lib/payments/settings";
import SandboxGateway from "@/components/checkout/sandbox-gateway";

export const dynamic = "force-dynamic";

export default async function SandboxPage() {
  if (await bookingMode() !== "SANDBOX") notFound();
  return <SandboxGateway />;
}
