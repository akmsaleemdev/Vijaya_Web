"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl: "/admin" });
      if (result?.ok && !result.error) { router.replace("/admin"); router.refresh(); }
      else setError("Sign-in failed. Check your details and try again later.");
    } catch {
      setError("Sign-in is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="v-stack">
    <label>Email address<input autoComplete="username" name="email" type="email" required maxLength={160} /></label>
    <label>Password<input autoComplete="current-password" name="password" type="password" required maxLength={72} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="v-button" data-primary disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
  </form>;
}

export function PasswordForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("repeat")) { setError("The new passwords must match."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: data.get("current"), password: data.get("password") }) });
      const result = await response.json();
      if (response.ok) await signOut({ callbackUrl: "/admin/login" });
      else setError(result.error?.message ?? "The password could not be changed.");
    } catch {
      setError("The password could not be changed.");
    } finally {
      setBusy(false);
    }
  }
  return <form className="v-stack" onSubmit={submit}>
    <label>Current password<input type="password" name="current" autoComplete="current-password" maxLength={72} required /></label>
    <label>New password<input type="password" name="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
    <label>Confirm new password<input type="password" name="repeat" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
    {error && <p role="alert">{error}</p>}
    <button className="v-button" data-primary disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
  </form>;
}

export function Logout() {
  return <button className="v-button" onClick={() => signOut({ callbackUrl: "/admin/login" })}>Sign out</button>;
}
