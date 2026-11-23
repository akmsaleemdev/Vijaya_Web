"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, type FormEvent, type ReactNode } from "react";

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api/admin/" + path, options);
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "The request failed.");
  return body.data;
}

export const json = (value: unknown, method = "POST", key?: string): RequestInit => ({
  method, headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, body: JSON.stringify(value),
});

export const useData = <T,>(path: string, poll = 0) => useQuery({
  queryKey: ["admin", path], queryFn: () => request<T>(path), refetchInterval: poll || false,
});

export function Load({ query, children }: { query: { isPending: boolean; error: Error | null }; children: ReactNode }) {
  if (query.isPending) return <div className="v-panel animate-pulse" role="status">Loading…</div>;
  if (query.error) return <p className="v-panel" role="alert">{query.error.message}</p>;
  return children;
}

export function Form({ children, submit, label = "Save", confirm, className = "v-stack" }: {
  children: ReactNode; submit: (data: FormData) => Promise<unknown>; label?: string; confirm?: string; className?: string;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await submit(data);
      toast.success("Saved");
      await client.invalidateQueries({ queryKey: ["admin"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }
  return <form className={className} onSubmit={onSubmit}>{children}<div><button className="v-button" data-primary disabled={busy}>{busy ? "Saving…" : label}</button></div></form>;
}
export const value = (form: FormData, name: string) => String(form.get(name) ?? "");
export function Select({ name, label, options, initial, empty }: { name: string; label: string; options: readonly (string | { id: string; name: string })[]; initial?: string; empty?: string }) {
  return <label>{label}<select name={name} defaultValue={initial}>{empty && <option value="">{empty}</option>}{options.map((option) => typeof option === "string" ?
    <option value={option} key={option}>{option.replaceAll("_", " ")}</option> : <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>;
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="v-table"><table><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
export const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const slotOptions = ["MORNING", "AFTERNOON", "EVENING", "FULL_DAY"] as const;
export type VenueOption = { id: string; name: string };
