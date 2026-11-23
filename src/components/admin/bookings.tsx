"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Form, Load, Select, Table, json, localDate, money, request, slotOptions, useData, value, type VenueOption } from "./api";

type Booking = {
  reference: string; spaceId: string; spaceName: string; eventDate: string; slot: string; status: string; source: string;
  eventType: string; customerName: string; customerEmail: string; customerPhone: string; customerCountry: string;
  guests: number; notes: string | null; baseAmount: number; weekendUplift: number; taxAmount: number;
  totalPayable: number; balance: number; addons: string | null;
  payments: { id: string; amount: number; status: string; method: string; providerRef: string }[];
  documents: { id: string; title: string }[];
  history: { id: string; action: string; createdAt: string }[];
  notesLog: { id: string; note: string }[];
};

const statuses = ["HOLD", "PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "REJECTED", "EXPIRED", "COMPLETED", "NO_SHOW"];
export function ManualBooking({ venues, date, customer }: { venues: VenueOption[]; date?: string; customer?: { name: string; email: string; phone: string } }) {
  const [key, setKey] = useState(() => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()));
  return <details className="v-panel" open={!!customer}><summary className="cursor-pointer font-semibold">Create a manual booking</summary>
    <Form label="Create confirmed booking" className="v-grid mt-4" submit={async (form) => {
      await request("bookings", json({
        spaceSlug: value(form, "spaceSlug"), date: value(form, "date"), slot: value(form, "slot"),
        eventType: value(form, "eventType"), guests: value(form, "guests"),
        addOns: value(form, "addOns").split(",").map((item) => item.trim()).filter(Boolean),
        customer: { name: value(form, "name"), email: value(form, "email"), phone: value(form, "phone"), notes: value(form, "notes") },
      }, "POST", key));
      setKey(crypto.randomUUID());
    }}>
      <Select name="spaceSlug" label="Venue" options={venues} />
      <label>Event date<input type="date" name="date" min={localDate()} defaultValue={date ?? localDate()} required /></label>
      <label>Session key<input name="slot" list="manual-session-options" defaultValue="EVENING" required /><datalist id="manual-session-options">{slotOptions.map((slot) => <option key={slot} value={slot} />)}</datalist></label>
      <Select name="eventType" label="Event type" options={["WEDDING", "BUSINESS", "CELEBRATION"]} />
      <label>Guest count<input name="guests" type="number" min="1" required /></label>
      <label>Customer name<input name="name" defaultValue={customer?.name} required /></label>
      <label>Customer email<input name="email" type="email" defaultValue={customer?.email} required /></label>
      <label>Customer phone<input name="phone" defaultValue={customer?.phone} required /></label>
      <label>Booking notes<input name="notes" /></label>
      <label>Configured add-ons, separated by commas<input name="addOns" /></label>
    </Form>
  </details>;
}

function BookingDetail({ reference, venues, operations }: { reference: string; venues: VenueOption[]; operations: boolean }) {
  const query = useData<Booking>("bookings/" + encodeURIComponent(reference), 10000);
  const row = query.data;
  const path = "bookings/" + encodeURIComponent(reference);
  const send = (data: unknown) => request(path, json(data, "PATCH"));
  return <Load query={query}>{row && <article className="v-panel v-stack">
    <div className="v-row justify-between"><h2>{row.reference} · {row.spaceName}</h2><span className="v-pill" data-state={row.status}>{row.status}</span></div>
    <div className="v-grid">
      <div><strong>Customer</strong><p>{row.customerName}</p><p>{row.customerEmail}</p><p>{row.customerPhone} · {row.customerCountry}</p></div>
      <div><strong>Event</strong><p>{row.eventDate} · {row.slot}</p><p>{row.eventType} · {row.guests} guests</p><p>{row.source}</p></div>
      <div><strong>Invoice</strong><p>Base {money(row.baseAmount)}</p><p>Weekend {money(row.weekendUplift)}</p><p>Tax {money(row.taxAmount)}</p><p>Balance {money(row.balance)}</p></div>
    </div>
    {row.notes && <p>{row.notes}</p>}
    {row.addons && <p>Add-ons {row.addons}</p>}
    <h2>Payments and documents</h2>
    <Table headers={["Payment", "Method", "Status", "Amount"]}>{row.payments.map((payment) => <tr key={payment.id}><td>{payment.providerRef}</td><td>{payment.method}</td><td>{payment.status}</td><td>{money(payment.amount)}</td></tr>)}</Table>
    <div className="v-row">{row.documents.map((doc) => <span key={doc.id} className="v-pill">{doc.title}</span>)}<button className="v-button" onClick={() => window.print()}>Print or save PDF</button>
      <a className="v-button" href={`/api/admin/booking-documents/${reference}?type=invoice`}>Download invoice</a>
      {["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(row.status) && <a className="v-button" href={`/api/admin/booking-documents/${reference}?type=confirmation`}>Download confirmation</a>}
    </div>
    <h2>Notes and activity</h2>
    {row.notesLog.map((note) => <p key={note.id}>{note.note}</p>)}
    {row.history.map((item) => <p key={item.id}>{item.action.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>)}
    {operations && <div className="v-stack v-actions">
      <h2>Booking actions</h2>
      {["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(row.status) && <div className="v-grid">
        {row.status !== "CONFIRMED" && <Form label="Confirm booking" submit={() => send({ action: "CONFIRM" })}><p>Confirm the existing hold.</p></Form>}
        <Form label="Apply cancellation or rejection" confirm="Release the session and update the booking?" submit={(form) => send({ action: value(form, "action"), reason: value(form, "reason") })}>
          <Select name="action" label="Action" options={row.status === "CONFIRMED" ? ["CANCEL"] : ["CANCEL", "REJECT"]} />
          <label>Reason<input name="reason" required /></label>
        </Form>
        <Form label="Reschedule" submit={(form) => send({ action: "RESCHEDULE", venue: value(form, "venue"), date: value(form, "date"), slot: value(form, "slot") })}>
          <Select name="venue" label="Venue" options={venues} initial={row.spaceId} />
          <label>New date<input name="date" type="date" min={localDate()} defaultValue={row.eventDate} required /></label>
          <label>Session key<input name="slot" defaultValue={row.slot} required /></label>
        </Form>
        {row.status === "CONFIRMED" && row.eventDate <= localDate() && <Form label="Mark attendance" submit={(form) => send({ action: value(form, "action") })}><Select name="action" label="Outcome" options={["COMPLETE", "NO_SHOW"]} /></Form>}
      </div>}
      <div className="v-grid">
        <Form label="Add note" submit={(form) => send({ action: "NOTE", note: value(form, "note") })}><label>Staff note<input name="note" required /></label></Form>
        {["CONFIRMED", "COMPLETED", "PENDING_PAYMENT"].includes(row.status) && row.balance > 0 && <Form label="Record offline payment" confirm="Record the payment against this booking?" submit={(form) => send({ action: "PAYMENT", amount: value(form, "amount"), method: value(form, "method"), key: crypto.randomUUID() })}>
          <label>Amount in INR<input name="amount" type="number" min="1" max={row.balance} required /></label>
          <Select name="method" label="Method" options={["CASH", "BANK_TRANSFER", "CARD", "UPI", "OTHER"]} />
        </Form>}
        {row.status === "CONFIRMED" && <Form label="Resend confirmation" confirm="Send a confirmation email to this customer?" submit={() => request("notifications", json({ reference, template: "confirmed" }))}><p>{row.customerEmail}</p></Form>}
      </div>
    </div>}
  </article>}</Load>;
}

export function Bookings({ operations, isOwner }: { operations: boolean; isOwner: boolean }) {
  const [params, setParams] = useState(new URLSearchParams());
  const [selected, setSelected] = useState("");
  const venueQuery = useData<VenueOption[]>(operations ? "venues" : "booking-venues");
  const query = useData<{ rows: Booking[]; total: number; page: number; limit: number }>("bookings?" + params.toString(), 10000);
  const venues = venueQuery.data ?? [];
  const columns = useMemo<ColumnDef<Booking>[]>(() => [
    { accessorKey: "reference", header: "Reference", cell: ({ row }) => <button className="v-link" type="button" onClick={() => setSelected(row.original.reference)}>{row.original.reference}</button> },
    { accessorKey: "customerName", header: "Customer" }, { accessorKey: "eventDate", header: "Event date" },
    { accessorKey: "spaceName", header: "Venue" }, { accessorKey: "slot", header: "Session" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <span className="v-pill" data-state={row.original.status}>{row.original.status}</span> },
    { accessorKey: "source", header: "Source" },
  ], []);
  // TanStack Table handles rendering while filters and pagination run on the server.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: query.data?.rows ?? [], columns, getCoreRowModel: getCoreRowModel(), manualPagination: true, manualSorting: true, manualFiltering: true });
  const page = query.data?.page ?? 1;
  function go(next: number) { setParams((old) => { const update = new URLSearchParams(old); update.set("page", String(next)); return update; }); }

  return <div className="v-stack">
    <section className="v-panel v-stack">
      <form className="v-grid" onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams();
        new FormData(event.currentTarget).forEach((val, key) => { if (typeof val === "string" && val) next.set(key, val); });
        setParams(next);
      }}>
        <label>Search<input name="q" placeholder="Reference, name, email or phone" /></label>
        <Select name="venue" label="Venue" options={venues} empty="All venues" />
        <Select name="status" label="Status" options={statuses} empty="All statuses" />
        <Select name="source" label="Source" options={["WEB", "ADMIN"]} empty="All sources" />
        <Select name="payment" label="Payment" options={["PAID", "OUTSTANDING"]} empty="All payments" />
        <label>From<input name="from" type="date" /></label><label>To<input name="to" type="date" /></label>
        <Select name="sort" label="Sort by" options={[{ id: "eventDate", name: "Event date" }, { id: "createdAt", name: "Created" }, { id: "customerName", name: "Customer" }, { id: "status", name: "Status" }]} />
        <Select name="order" label="Order" options={[{ id: "desc", name: "Descending" }, { id: "asc", name: "Ascending" }]} />
        <div className="self-end"><button className="v-button" data-primary>Apply filters</button></div>
      </form>
      <Load query={query}><div className="v-table"><table>
        <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} scope="col">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
        <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
      </table></div>
      {!query.data?.rows.length && <p className="v-muted">No bookings match these filters.</p>}
      <div className="v-row">
        <button className="v-button" disabled={page <= 1} onClick={() => go(page - 1)}>Previous</button>
        <span>Page {page} · {query.data?.total ?? 0} bookings</span>
        <button className="v-button" disabled={(query.data?.total ?? 0) <= page * 25} onClick={() => go(page + 1)}>Next</button>
        {isOwner && <a className="v-button" href={`/api/admin/bookings?${params}&export=csv`}>Export CSV</a>}
        {isOwner && <a className="v-button" href={`/api/admin/bookings?${params}&export=xlsx`}>Export Excel</a>}
      </div></Load>
    </section>
    {selected && <BookingDetail key={selected} reference={selected} venues={venues} operations={operations} />}
    {operations && <ManualBooking venues={venues} />}
  </div>;
}

type Slot = { id: string; date: string; slot: string; status: string; groupId: string | null; bookingRef: string | null; note: string | null; source: string; space: { name: string } };
export function Calendar({ operations }: { operations: boolean }) {
  const [mode, setMode] = useState("Month");
  const [day, setDay] = useState(localDate);
  const [venue, setVenue] = useState("");
  const venueQuery = useData<VenueOption[]>(operations ? "venues" : "booking-venues");
  const venues = venueQuery.data ?? [];
  const start = mode === "Month" ? day.slice(0, 7) + "-01" : day;
  const days = mode === "Month" ? new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate() : mode === "Week" ? 7 : 1;
  const dates = Array.from({ length: days }, (_, i) => new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10));
  const query = useData<Slot[]>(`calendar?from=${start}&to=${dates.at(-1)}${venue ? "&venue=" + encodeURIComponent(venue) : ""}`, 15000);
  const [selected, setSelected] = useState("");
  return <div className="v-stack">
    <div className="v-panel v-stack">
      <div className="v-row">
        {["Month", "Week", "Day"].map((option) => <button className="v-button" type="button" data-primary={mode === option ? true : undefined} key={option} onClick={() => setMode(option)}>{option}</button>)}
        <label>Starting date<input type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} /></label>
        <label>Venue<select value={venue} onChange={(event) => setVenue(event.target.value)}><option value="">All venues</option>{venues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <Load query={query}><div className="v-grid">{dates.map((date) => {
        const slots = query.data?.filter((row) => row.date === date) ?? [];
        return <section key={date} className="v-panel v-stack">
          <button className="v-link text-left font-semibold" onClick={() => setDay(date)}>{date}</button>
          {!slots.length && <p className="v-muted">No reservations</p>}
          {slots.map((slot) => <div key={slot.id} className="v-stack gap-1">
            <span className="v-pill" data-state={slot.status}>{slot.space.name} · {slot.slot} · {slot.status}</span>
            {slot.bookingRef && slot.source !== "OFFLINE_CRM" && <button className="v-link text-left" onClick={() => setSelected(slot.bookingRef ?? "")}>{slot.bookingRef}</button>}
            {slot.note && <p className="v-muted">{slot.note}</p>}
            {operations && slot.groupId && slot.status === "BLOCKED" && slot.source === "OPS" && <Form label="Remove block" confirm="Remove this entire block?" submit={() => request("blocks/" + slot.groupId, { method: "DELETE" })}>{null}</Form>}
          </div>)}
        </section>;
      })}</div></Load>
    </div>
    {selected && <BookingDetail key={selected} reference={selected} venues={venues} operations={operations} />}
    {operations && <><ManualBooking key={day} venues={venues} date={day} /><section className="v-panel v-stack"><h2>Block a date or session</h2>
      <Form className="v-grid" key={day} label="Block availability" confirm="Block the selected venue and dates?" submit={(form) => request("blocks", json(Object.fromEntries(form)))}>
        <Select name="venue" label="Venue" options={[{ id: "ALL", name: "All venues" }, ...venues]} />
        <label>From<input type="date" name="from" min={localDate()} defaultValue={day} required /></label>
        <label>To<input type="date" name="to" min={localDate()} defaultValue={day} required /></label>
        <Select name="slot" label="Session" options={["FULL_DAY", "MORNING", "AFTERNOON", "EVENING"]} />
        <label>Reason<input name="reason" maxLength={2000} required /></label>
      </Form></section></>}
  </div>;
}
