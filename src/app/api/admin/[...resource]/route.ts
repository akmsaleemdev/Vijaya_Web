import { bookingDocument } from "@/lib/admin/documents";
import { gateways } from "@/lib/admin/gateways";
import { query } from "@/lib/db";
import { access, failure, guard, success } from "@/lib/admin/http";
import { blockDates, bookings, createBooking, updateBooking } from "@/lib/admin/bookings";
import { content, preview } from "@/lib/admin/content";
import { media } from "@/lib/admin/media";
import { auditLog, calendar, customers, dashboard, enquiries, sessions, users, venues } from "@/lib/admin/operations";
import { notifications, payments } from "@/lib/admin/finance";

const resources = {
  "booking-venues": { GET: access.bookings },
  "booking-documents": { GET: access.bookings },
  gateways: { GET: access.owner, POST: access.owner },
  dashboard: { GET: access.bookings },
  bookings: { GET: access.bookings, POST: access.operations, PATCH: access.operations },
  calendar: { GET: access.bookings },
  blocks: { POST: access.operations, DELETE: access.operations },
  venues: { GET: access.operations, POST: access.operations, DELETE: access.operations },
  sessions: { GET: access.operations, POST: access.operations },
  content: { GET: access.content, POST: access.content },
  media: { GET: access.content, POST: access.content, DELETE: access.content },
  preview: { POST: access.content },
  enquiries: { GET: access.operations, PATCH: access.operations },
  customers: { GET: access.operations, POST: access.operations },
  payments: { GET: access.operations, PATCH: access.operations },
  notifications: { GET: access.operations, POST: access.operations },
  users: { GET: access.owner, POST: access.owner, PATCH: access.owner },
  audit: { GET: access.owner },
} as const;

async function handler(req: Request, { params }: { params: Promise<{ resource: string[] }> }) {
  const [resource, id, extra] = (await params).resource;
  if (extra || !Object.hasOwn(resources, resource)) return failure(404, "NOT_FOUND", "Resource not found.");
  const methods = resources[resource as keyof typeof resources];
  const allowed = methods[req.method as keyof typeof methods] as typeof access.all | undefined;
  if (!allowed) return failure(405, "METHOD_NOT_ALLOWED", "This method is unavailable.");
  try {
    const actor = await guard(req, allowed);
    if (actor instanceof Response) return actor;
    switch (resource) {
      case "booking-venues": {
        const { rows } = await query<{ id: string; name: string }>(
          `SELECT "id", "name" FROM vijaya."Space" ORDER BY "name" ASC`,
        );
        return success(rows);
      }
      case "booking-documents": return await bookingDocument(req, id);
      case "gateways": return await gateways(req, actor);
      case "dashboard": return await dashboard();
      case "bookings":
        if (req.method === "GET") return await bookings(req, actor, id);
        if (req.method === "POST" && !id) return await createBooking(req, actor);
        if (id && req.method === "PATCH") return await updateBooking(req, actor, id);
        return failure(404, "NOT_FOUND", "Booking not found.");
      case "calendar": return await calendar(req);
      case "blocks": return await blockDates(req, actor, id);
      case "venues": return await venues(req, actor, id);
      case "sessions": return await sessions(req, actor);
      case "content": return await content(req, actor);
      case "media": return await media(req, actor, id);
      case "preview": return await preview(req, actor);
      case "enquiries": return await enquiries(req, actor, id);
      case "customers": return await customers(req, actor);
      case "payments": return await payments(req, actor, id);
      case "notifications": return await notifications(req, actor);
      case "users": return await users(req, actor, id);
      case "audit": return await auditLog(req);
      default: return failure(404, "NOT_FOUND", "Resource not found.");
    }
  } catch (error) {
    console.error("Admin request failed", resource, error instanceof Error ? error.name : "UnknownError");
    return failure(500, "SERVER_ERROR", "The request could not be completed.");
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
