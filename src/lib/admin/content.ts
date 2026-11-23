import { Prisma } from "@prisma/client";
import { draftMode } from "next/headers";
import { db } from "@/lib/db";
import { invalidateContent } from "@/lib/cms/revalidate";
import { bookingTransaction } from "@/lib/booking/transaction";
import { contentCatalog } from "@/lib/cms/catalog";
import { contentInput, schemaFor } from "./content-schema";
import { audit, failure, success, type Identity } from "./http";

export async function content(req: Request, actor: Identity) {
  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("defaults") === "true") {
      return success(contentCatalog);
    }
    return success(await db.contentEntry.findMany({ orderBy: [{ key: "asc" }, { locale: "asc" }], include: { versions: { orderBy: { createdAt: "desc" }, take: 25 } } }));
  }
  const parsed = contentInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_CONTENT", "Check the content key and action.");
  const { key, locale, action, payload, version } = parsed.data;
  if ((key === "site.settings" || key === "email.templates") && actor.admin.role !== "SUPER_ADMIN") return failure(403, "FORBIDDEN", "An administrator manages this setting.");
  const schema = schemaFor(key);
  if (!schema) return failure(422, "UNKNOWN_CONTENT", "Choose a registered content type.");
  const result = await bookingTransaction(async (tx) => {
    const where = { key_locale: { key, locale } };
    const current = await tx.contentEntry.findUnique({ where });
    if (action === "DELETE" || action === "UNPUBLISH") {
      if (!current) return failure(404, "NOT_FOUND", "Content entry not found.");
      if (action === "DELETE") await tx.contentEntry.delete({ where });
      else await tx.contentEntry.update({ where, data: { published: Prisma.DbNull, editedBy: actor.admin.id } });
      await audit(tx, actor, action, "ContentEntry", current.id, current);
      return success({ key, locale });
    }
    const historical = action === "RESTORE" && current && version
      ? await tx.contentVersion.findFirst({ where: { id: version, entryId: current.id } })
      : null;
    if (action === "RESTORE" && !historical) return failure(404, "NOT_FOUND", "Content version not found.");
    const checked = schema.safeParse(historical ? historical.payload : payload);
    if (!checked.success) return failure(422, "INVALID_CONTENT", "Validate the content fields.", checked.error.issues);
    const draft = checked.data as Prisma.InputJsonValue;
    const published = action === "PUBLISH" ? draft : undefined;
    const update = { draft, published, editedBy: actor.admin.id };
    const next = await tx.contentEntry.upsert({ where, update, create: { key, locale, ...update } });
    await tx.contentVersion.create({ data: { entryId: next.id, payload: draft, actorId: actor.admin.id } });
    await audit(tx, actor, action, "ContentEntry", next.id, current, next);
    return success(next);
  });
  if (result.ok && !["DRAFT", "RESTORE"].includes(action)) invalidateContent(key);
  return result;
}

export async function preview(req: Request, actor: Identity) {
  const url = new URL(req.url);
  const flag = url.searchParams.get("enabled") === "true";
  const mode = await draftMode();
  if (flag) mode.enable();
  else mode.disable();
  await db.auditLog.create({ data: { action: flag ? "PREVIEW_ENABLED" : "PREVIEW_DISABLED", entity: "ContentEntry", entityRef: "site", actorId: actor.admin.id, ip: actor.ip } });
  return success({ preview: flag });
}
