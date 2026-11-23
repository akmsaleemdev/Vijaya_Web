"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import dynamic from "next/dynamic";
import { GalleryEditor } from "./gallery-editor";
const NewsEditor = dynamic(() => import("./news-editor"), { ssr: false });
import type { modules } from "@/lib/admin/modules";
import { Bookings, Calendar, ManualBooking } from "./bookings";
import { Form, Load, Select, Table, json, money, request, useData, value, type VenueOption } from "./api";

type Module = keyof typeof modules;
type Data = string | number | boolean | null;
type Row = { id: string; [key: string]: unknown };
const labels: Record<Module, string> = {
  dashboard: "Overview", bookings: "Bookings", calendar: "Calendar", venues: "Venues & pricing", content: "Website content",
  media: "Media library", enquiries: "Enquiries", customers: "Customers", payments: "Payments", notifications: "Notifications",
  users: "Users & roles", audit: "Audit log", settings: "Settings",
};
const roles = ["SUPER_ADMIN", "MANAGER", "EDITOR", "VIEWER"] as const;
const templates = ["received", "confirmed", "reminder", "cancelled", "receipt"];
const pipeline = ["NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "WON", "LOST"];

export function AdminModule({ module, role }: { module: Module; role: typeof roles[number] }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const canEdit = role === "SUPER_ADMIN" || role === "MANAGER";
  const owner = role === "SUPER_ADMIN";
  return <QueryClientProvider client={client}><div className="v-stack"><h1>{labels[module]}</h1>
    {module === "dashboard" && <Dashboard />}
    {module === "bookings" && <Bookings operations={canEdit} isOwner={owner} />}
    {module === "calendar" && <Calendar operations={canEdit} />}
    {module === "venues" && <Venues />}
    {module === "content" && <ContentEditor owner={owner} />}
    {module === "settings" && <ContentEditor owner={owner} settings />}
    {module === "media" && <Media />}
    {module === "enquiries" && <Enquiries />}
    {module === "customers" && <Customers />}
    {module === "payments" && <Payments />}
    {module === "notifications" && <Notifications />}
    {module === "users" && <Users />}
    {module === "audit" && <Audit />}
  </div></QueryClientProvider>;
}

type DashEvent = { reference: string; eventDate: string; spaceName: string; status?: string; holdExpiresAt?: string };
function Dashboard() {
  const query = useData<{ kpis: Record<string, number>; charts: Record<string, { name: string; count: number }[]>; next: DashEvent[]; pending: DashEvent[]; expiring: DashEvent[] }>("dashboard", 15000);
  const data = query.data;
  const lists: Record<string, DashEvent[]> = data ? { "Next events": data.next, "Needs action": data.pending, "Expiring holds": data.expiring } : {};
  return <Load query={query}>{data && <>
    <div className="v-grid">{Object.entries(data.kpis).map(([label, metric]) => <article key={label} className="v-panel"><p className="v-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{["Monthly revenue", "Outstanding balance"].includes(label) ? money(metric) : metric.toLocaleString("en-IN")}</p></article>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">{Object.entries(data.charts).map(([name, points]) => <section className="v-panel v-stack" key={name}>
      <h2>{name}</h2>
      {points.length ? <div className="h-56 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={points}><CartesianGrid vertical={false} stroke="#eee4db" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis width={55} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" name={name} fill="#651c33" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="v-muted">No data for this period.</p>}
    </section>)}</div>
    <div className="v-grid">{Object.entries(lists).map(([title, rows]) => <section key={title} className="v-panel v-stack"><h2>{title}</h2>
      {rows.length ? rows.map((row) => <div key={row.reference}><p className="font-semibold">{row.spaceName} · {row.eventDate}</p><p className="v-muted">{row.reference} {row.status ?? (row.holdExpiresAt ? "· " + new Date(row.holdExpiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "")}</p></div>) : <p className="v-muted">Nothing scheduled.</p>}
    </section>)}</div>
  </>}</Load>;
}

function text(row: Row, field: string) { return String(row[field] ?? ""); }
function date(row: Row, field: string) { return text(row, field).slice(0, 10); }
function Field({ name, label, initial, type = "text", required = false, secret = false }: { name: string; label: string; initial?: Data; type?: string; required?: boolean; secret?: boolean }) {
  return <label>{label}<input name={name} type={type} defaultValue={initial == null ? undefined : String(initial)} required={required} autoComplete={secret ? "new-password" : undefined} /></label>;
}

function Venues() {
  const spaces = useData<Row[]>("venues");
  const sessions = useData<Row[]>("sessions");
  const [id, setId] = useState("");
  const selected = spaces.data?.find((row) => row.id === id);
  const [sessionId, setSessionId] = useState("");
  const session = sessions.data?.find((row) => row.id === sessionId);
  const venues = (spaces.data ?? []).map((row) => ({ id: row.id, name: text(row, "name") }));
  return <Load query={spaces}><div className="v-grid">
    <section className="v-panel v-stack"><h2>Venue details</h2>
      <label>Venue<select value={id} onChange={(e) => setId(e.target.value)}><option value="">New venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
      <Form key={id} label="Save venue" submit={(form) => request("venues", json({
        ...Object.fromEntries(form), pricing: JSON.parse(value(form, "pricing") || "{}"),
        active: form.has("active"), bookableOnline: form.has("bookableOnline"), requiresApproval: form.has("requiresApproval"), availabilityEnabled: form.has("availabilityEnabled"),
      }))}>
        <label>Venue key<input name="id" defaultValue={id} readOnly={!!id} required /></label>
        <Field label="Venue name" name="name" initial={selected && text(selected, "name")} required />
        <Select name="category" label="Category" options={["MULTI", "WEDDING", "BUSINESS", "CELEBRATION"]} initial={selected && text(selected, "category")} />
        <Select name="setting" label="Setting" options={["INDOOR", "OUTDOOR"]} initial={selected && text(selected, "setting")} />
        <div className="v-grid">
          <Field label="Minimum capacity" name="capacityMin" type="number" initial={selected ? Number(selected.capacityMin ?? 0) : 0} required />
          <Field label="Maximum capacity" name="capacityMax" type="number" initial={selected ? Number(selected.capacityMax ?? 100) : 100} required />
          <Field label="Display order" name="sortOrder" type="number" initial={selected ? Number(selected.sortOrder ?? 0) : 0} required />
        </div>
        <label>Description<textarea name="description" defaultValue={selected && text(selected, "description")} /></label>
        <label>Pricing rules (JSON)<textarea name="pricing" defaultValue={selected ? text(selected, "pricingJson") || "{}" : "{}"} /></label>
        <p className="v-muted">Use base by session, weekend, tax, advance, seasonal, addOns and cancellation.</p>
        <div className="v-row">{["active", "bookableOnline", "availabilityEnabled", "requiresApproval"].map((key) => <label key={key} className="!flex"><input type="checkbox" name={key} defaultChecked={selected ? !!selected[key] : key !== "requiresApproval"} />{{ active: "Active", bookableOnline: "Online booking", availabilityEnabled: "Show availability", requiresApproval: "Requires approval" }[key]}</label>)}</div>
      </Form>
      {selected?.active === true && <Form label="Archive venue" confirm="Archive this venue from booking availability?" submit={() => request("venues/" + id, { method: "DELETE" })}>{null}</Form>}
    </section>
    <section className="v-panel v-stack"><h2>Sessions</h2><Load query={sessions}>
      <label>Session<select value={sessionId} onChange={(event) => setSessionId(event.target.value)}><option value="">New session or override</option>{sessions.data?.map((row) => <option key={row.id} value={row.id}>{text(row, "spaceId")} · {text(row, "key")}</option>)}</select></label>
      <Form key={sessionId} label="Save session" submit={(form) => request("sessions", json({ ...Object.fromEntries(form), enabled: form.has("enabled") }))}>
        <Select name="spaceId" label="Venue" options={venues} initial={session && text(session, "spaceId")} />
        <Field label="Session key" name="key" initial={session && text(session, "key")} required />
        <Field label="Display name" name="label" initial={session && text(session, "label")} required />
        <Field label="Start minute after midnight" name="startMinute" type="number" initial={session && Number(session.startMinute)} required />
        <Field label="End minute after midnight" name="endMinute" type="number" initial={session && Number(session.endMinute)} required />
        <label className="!flex items-center"><input type="checkbox" name="enabled" defaultChecked={session ? !!session.enabled : true} /> Enabled</label>
      </Form></Load>
    </section>
  </div></Load>;
}

type ContentRow = { id: string; key: string; locale: string; draft: string; published: string | null; editedBy: string; updatedAt: string; versions: { id: string; createdAt: string }[] };
const pages = ["home", "about", "booking-policy", "business", "cancellation-policy", "celebrations", "check-your-date", "contact", "experiences", "faq", "gallery", "global-desk", "plan-your-event", "privacy", "spaces", "terms", "venue-visit", "weddings"];
const contentTypes = ["home.hero", "gallery.items", "site.navigation", "site.footer", "site.faq", "site.contact", "site.announcement", "site.seo", "collections.testimonials", "collections.offers", "collections.team", "collections.awards", "collections.news", ...pages.map((page) => "page." + page)];
function ContentEditor({ owner, settings = false }: { owner: boolean; settings?: boolean }) {
  const entries = useData<ContentRow[]>("content");
  const defaults = useData<Record<string, unknown>>("content?defaults=true");
  const [contentKey, setKey] = useState(settings ? "site.settings" : "home.hero");
  const [locale, setLocale] = useState("en");
  const row = entries.data?.find((item) => item.key === contentKey && item.locale === locale);
  const [custom, setCustom] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const key = contentKey === "custom" ? custom : contentKey;
  const templates = settings ? ["site.settings", "site.contact", "site.seo", "email.templates"] : [...contentTypes, "custom"];
  return <Load query={entries}><section className="v-panel v-stack">
    <div className="v-row">
      <label>Content section<select value={contentKey} onChange={(e) => setKey(e.target.value)}>{templates.map((tag) => <option key={tag}>{tag}</option>)}</select></label>
      <label>Language<select value={locale} onChange={(e) => setLocale(e.target.value)}><option value="en">English</option><option value="ml">Malayalam</option></select></label>
      {contentKey === "custom" && <label>Page or venue key<input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="venue.periyar" /></label>}
    </div>
    <div className="v-row"><span className="v-pill">{row?.published ? "Published" : row ? "Draft" : "Using site defaults"}</span>{row && <span className="v-muted">Edited {new Date(row.updatedAt).toLocaleString("en-IN")} · {row.editedBy}</span>}</div>
    <Form key={row?.updatedAt ?? key + locale + (defaults.data ? "-loaded" : "")} label="Save content" submit={(form) => request("content", json({ key, locale, action: value(form, "action"), payload: JSON.parse(value(form, "payload")) }))}>
      <Select name="action" label="Workflow" options={["DRAFT", "PUBLISH"]} />
      {key === "gallery.items" ? <GalleryEditor initial={row ? JSON.parse(row.draft) : (defaults.data?.[key] as React.ComponentProps<typeof GalleryEditor>["initial"] | undefined) ?? []} />
        : key === "collections.news" ? <NewsEditor initial={row ? JSON.parse(row.draft) : []} />
        : <label>Content (JSON)<textarea name="payload" rows={16} className="font-mono" defaultValue={row ? JSON.stringify(JSON.parse(row.draft), null, 2) : key === "home.hero" ? '{\n  "heading": "Every Great Occasion Deserves a Grand Address."\n}' : JSON.stringify(defaults.data?.[key] ?? {}, null, 2)} required /></label>}

    </Form>
    <div className="v-row">
      <Form label={previewing ? "End preview" : "Enable draft preview"} submit={async () => { await request(`preview?enabled=${!previewing}`, { method: "POST" }); setPreviewing(!previewing); }}>{null}</Form>
      {previewing && <a className="v-link" href="/" target="_blank" rel="noreferrer">Open website preview</a>}
    </div>
    {row && <><Form label="Restore to draft" submit={(form) => request("content", json({ key, locale, action: "RESTORE", version: value(form, "version") }))}>
      <Select name="version" label="Version history" options={row.versions.map((version) => ({ id: version.id, name: new Date(version.createdAt).toLocaleString("en-IN") }))} />
    </Form>
    <Form label="Unpublish or delete" confirm="Remove the published override and restore site defaults?" submit={(form) => request("content", json({ key, locale, action: value(form, "action") }))}>
      <Select name="action" label="Remove override" options={owner ? ["UNPUBLISH", "DELETE"] : ["UNPUBLISH"]} />
    </Form></>}
  </section></Load>;
}

function Media() {
  const query = useData<Row[]>("media");
  return <div className="v-stack">
    <section className="v-panel v-stack"><h2>Upload media</h2><Form label="Upload" submit={(body) => request("media", { method: "POST", body })}>
      <label>File<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,application/pdf" required /></label>
      <div className="v-grid"><Field name="alt" label="Alternative text" /><Field name="folder" label="Folder" /><Field name="tags" label="Tags" /></div>
    </Form></section>
    <Load query={query}><div className="v-grid">{query.data?.map((row) => <article className="v-panel v-stack" key={row.id}>
      <strong>{text(row, "alt") || text(row, "mime")}</strong><p>{text(row, "folder")} {text(row, "tags")}</p>
      <a className="v-link break-all" href={`/api/media/${text(row, "filename")}`}>/api/media/{text(row, "filename")}</a>
      <Form label="Delete file" confirm="Delete this media file permanently?" submit={() => request("media/" + row.id, { method: "DELETE" })}>{null}</Form>
    </article>)}</div>{!query.data?.length && <p className="v-muted">No uploaded files.</p>}</Load>
  </div>;
}

function Enquiries() {
  const query = useData<Row[]>("enquiries", 15000);
  const spaces = useData<VenueOption[]>("venues");
  return <Load query={query}><div className="v-stack">{query.data?.map((row) => <details key={row.id} className="v-panel"><summary className="cursor-pointer">{text(row, "name")} · {text(row, "type")} · {text(row, "stage")}</summary>
    <div className="v-stack mt-3"><p>{text(row, "email")} · {text(row, "phone")}</p><p>{text(row, "message")}</p>
      <p>{text(row, "eventDate")} {text(row, "eventType")} {text(row, "venueInterest")}</p>
      <Form label="Update enquiry" className="v-grid" submit={(form) => request("enquiries/" + row.id, json({ stage: value(form, "stage"), notes: value(form, "notes"), followUpAt: value(form, "followUpAt") || null }, "PATCH"))}>
        <Select name="stage" label="Pipeline stage" options={pipeline} initial={text(row, "stage") === "New Lead" ? "NEW" : text(row, "stage")} />
        <Field name="followUpAt" label="Follow-up date" type="date" initial={date(row, "followUpAt")} />
        <label>Internal notes<textarea name="notes" defaultValue={text(row, "internalNotes")} /></label>
      </Form>
      <ManualBooking venues={spaces.data ?? []} date={text(row, "eventDate") || undefined} customer={{ name: text(row, "name"), email: text(row, "email"), phone: text(row, "phone") }} />
    </div>
  </details>)}</div>{!query.data?.length && <p className="v-muted">No enquiries yet.</p>}</Load>;
}

type Customer = { customerEmail: string; _count: { _all: number }; _max: { customerName: string; eventDate: string } };
function Customers() {
  const query = useData<Customer[]>("customers");
  const [email, setEmail] = useState("");
  return <Load query={query}><section className="v-panel v-stack">
    <Table headers={["Name", "Email", "Bookings", "Latest event"]}>{query.data?.map((row) => <tr key={row.customerEmail}><td><button className="v-link" onClick={() => setEmail(row.customerEmail)}>{row._max.customerName}</button></td><td>{row.customerEmail}</td><td>{row._count._all}</td><td>{row._max.eventDate}</td></tr>)}</Table>
    {!query.data?.length && <p className="v-muted">No customers yet.</p>}
    {email && <CustomerDetail key={email} email={email} />}
  </section></Load>;
}
function CustomerDetail({ email }: { email: string }) {
  const query = useData<{ bookings: { reference: string; spaceName: string; eventDate: string; status: string; payments: { amount: number; status: string }[] }[]; notes: { id: string; note: string }[] }>("customers?email=" + encodeURIComponent(email));
  const total = query.data?.bookings.flatMap((row) => row.payments).reduce((sum, payment) => sum + (payment.status === "SUCCESS" ? payment.amount : 0), 0) ?? 0;
  return <Load query={query}><div className="v-stack"><h2>{email}</h2><p>Lifetime payments {money(total)}</p>
    {query.data?.bookings.map((row) => <p key={row.reference}>{row.reference} · {row.spaceName} · {row.eventDate} · {row.status}</p>)}
    {query.data?.notes.map((row) => <p key={row.id}>{row.note}</p>)}
    <Form label="Add customer note" submit={(form) => request("customers", json({ email, note: value(form, "note") }))}><label>Note<textarea name="note" required /></label></Form>
  </div></Load>;
}

function Payments() {
  const query = useData<(Row & { booking: { reference: string; spaceName: string } })[]>("payments");
  return <Load query={query}><section className="v-panel v-stack"><Table headers={["Booking", "Payment", "Provider", "Amount", "Status", "Operations"]}>{query.data?.map((row) => <tr key={row.id}>
    <td>{row.booking.reference}</td><td>{text(row, "providerRef")}</td><td>{text(row, "provider")}</td><td>{money(Number(row.amount))}</td><td>{text(row, "status")}</td><td>
      {row.status === "SUCCESS" && <details><summary>Record refund</summary><Form label="Mark as refunded" confirm="Record this full refund?" submit={(form) => request("payments/" + row.id, json({ reason: value(form, "reason") }, "PATCH"))}><Field label="Reason or reference" name="reason" required /></Form></details>}
    </td></tr>)}</Table>{!query.data?.length && <p className="v-muted">No payments yet.</p>}</section></Load>;
}

function Notifications() {
  const query = useData<Row[]>("notifications");
  return <div className="v-stack"><section className="v-panel v-stack"><h2>Send booking email</h2>
    <Form label="Send email" confirm="Send this email to the customer on the booking?" submit={(form) => request("notifications", json(Object.fromEntries(form)))}>
      <Field name="reference" label="Booking reference" required /><Select name="template" label="Template" options={templates} />
    </Form></section>
    <Load query={query}><section className="v-panel v-stack"><h2>Delivery log</h2><Table headers={["Booking", "Template", "Status", "Date"]}>{query.data?.map((row) => <tr key={row.id}><td>{text(row, "bookingRef")}</td><td>{text(row, "template")}</td><td>{text(row, "status")}</td><td>{date(row, "createdAt")}</td></tr>)}</Table>
      {!query.data?.length && <p className="v-muted">No emails have been sent.</p>}</section></Load></div>;
}

function Users() {
  const query = useData<Row[]>("users");
  return <div className="v-stack">
    <section className="v-panel v-stack"><h2>Create admin account</h2><Form submit={(form) => request("users", json(Object.fromEntries(form)))} className="v-grid" label="Create account">
      <Field label="Name" name="name" required /><Field label="Email" name="email" type="email" required />
      <Select label="Role" name="role" options={roles} initial="VIEWER" /><Field label="Temporary password" name="password" type="password" secret required />
    </Form></section>
    <Load query={query}><div className="v-grid">{query.data?.map((row) => <section className="v-panel v-stack" key={row.id}><h2>{text(row, "name")}</h2><p>{text(row, "email")}</p>
      <Form confirm="Save these changes and end active sessions?" label="Update account and revoke sessions" submit={(form) => request("users/" + row.id, json({ role: value(form, "role"), disabled: form.has("disabled"), password: value(form, "password") || undefined, revoke: true }, "PATCH"))}>
        <Select label="Role" name="role" options={roles} initial={text(row, "role")} />
        <label className="!flex"><input type="checkbox" name="disabled" defaultChecked={!!row.disabled} /> Disabled</label>
        <Field label="Force reset to new temporary password" name="password" type="password" secret />
      </Form>
    </section>)}</div></Load>
  </div>;
}

function Audit() {
  const [search, setSearch] = useState("");
  const query = useData<Row[]>("audit?" + search);
  return <section className="v-panel v-stack">
    <form className="v-row" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setSearch(new URLSearchParams({ entity: value(form, "entity"), action: value(form, "action") }).toString());
    }}>
      <Field label="Entity" name="entity" /><Field label="Action" name="action" /><button className="v-button">Filter</button>
      <a className="v-button" href={"/api/admin/audit?" + search + "&export=json"}>Export audit log</a>
    </form>
    <Load query={query}><Table headers={["Time", "Action", "Entity", "Reference", "Actor", "IP", "Changes"]}>{query.data?.map((row) => <tr key={row.id}>
      <td>{new Date(text(row, "createdAt")).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td>{text(row, "action")}</td><td>{text(row, "entity")}</td><td>{text(row, "entityRef")}</td><td>{text(row, "actorId")}</td><td>{text(row, "ip")}</td>
      <td><details><summary>View changes</summary><pre>{text(row, "beforeJson")}{"\n"}{text(row, "afterJson") || text(row, "detailJson")}</pre></details></td>
    </tr>)}</Table>{!query.data?.length && <p className="v-muted">No audit entries match.</p>}</Load>
  </section>;
}
