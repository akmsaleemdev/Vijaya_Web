import { randomUUID } from "node:crypto";
import { draftMode } from "next/headers";
import { query } from "@/lib/db";
import { invalidateContent } from "@/lib/cms/revalidate";
import { bookingTransaction } from "@/lib/booking/transaction";
import { contentCatalog } from "@/lib/cms/catalog";
import { contentInput, schemaFor } from "./content-schema";
import { audit, failure, success, type Identity } from "./http";
import type { ContentEntry, ContentVersion } from "@/lib/db/types";

export async function content(req: Request, actor: Identity) {
  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("defaults") === "true") {
      return success(contentCatalog);
    }
    const { rows } = await query<ContentEntry & { versions: ContentVersion[] }>(
      `SELECT e.*,
         COALESCE((SELECT json_agg(v ORDER BY v."createdAt" DESC)
                   FROM (SELECT * FROM vijaya."ContentVersion" WHERE "entryId" = e."id" ORDER BY "createdAt" DESC LIMIT 25) v),
                  '[]'::json) AS versions
       FROM vijaya."ContentEntry" e ORDER BY e."key" ASC, e."locale" ASC`,
    );
    return success(rows);
  }
  const parsed = contentInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_CONTENT", "Check the content key and action.");
  const { key, locale, action, payload, version } = parsed.data;
  if ((key === "site.settings" || key === "email.templates") && actor.admin.role !== "SUPER_ADMIN") return failure(403, "FORBIDDEN", "An administrator manages this setting.");
  const schema = schemaFor(key);
  if (!schema) return failure(422, "UNKNOWN_CONTENT", "Choose a registered content type.");
  const result = await bookingTransaction(async (tx) => {
    const { rows: [current] } = await tx.query<ContentEntry>(
      `SELECT * FROM vijaya."ContentEntry" WHERE "key" = $1 AND "locale" = $2`,
      [key, locale],
    );
    if (action === "DELETE" || action === "UNPUBLISH") {
      if (!current) return failure(404, "NOT_FOUND", "Content entry not found.");
      if (action === "DELETE") {
        await tx.query(`DELETE FROM vijaya."ContentEntry" WHERE "id" = $1`, [current.id]);
      } else {
        await tx.query(`UPDATE vijaya."ContentEntry" SET "published" = NULL, "editedBy" = $2, "updatedAt" = now() WHERE "id" = $1`, [current.id, actor.admin.id]);
      }
      await audit(tx, actor, action, "ContentEntry", current.id, current);
      return success({ key, locale });
    }
    const historical = action === "RESTORE" && current && version
      ? (await tx.query<ContentVersion>(
        `SELECT * FROM vijaya."ContentVersion" WHERE "id" = $1 AND "entryId" = $2`,
        [version, current.id],
      )).rows[0]
      : null;
    if (action === "RESTORE" && !historical) return failure(404, "NOT_FOUND", "Content version not found.");
    const checked = schema.safeParse(historical ? historical.payload : payload);
    if (!checked.success) return failure(422, "INVALID_CONTENT", "Validate the content fields.", checked.error.issues);
    const draft = JSON.stringify(checked.data);
    const { rows: [next] } = await tx.query<ContentEntry>(
      `INSERT INTO vijaya."ContentEntry" ("id", "key", "locale", "draft", "published", "editedBy", "updatedAt")
       VALUES ($1,$2,$3,$4::jsonb,CASE WHEN $5 THEN $4::jsonb ELSE NULL END,$6,now())
       ON CONFLICT ("key", "locale") DO UPDATE
       SET "draft" = EXCLUDED."draft",
           "published" = CASE WHEN $5 THEN EXCLUDED."draft" ELSE vijaya."ContentEntry"."published" END,
           "editedBy" = EXCLUDED."editedBy", "updatedAt" = now()
       RETURNING *`,
      [randomUUID(), key, locale, draft, action === "PUBLISH", actor.admin.id],
    );
    if (!next) throw new Error("Content entry write returned no row.");
    await tx.query(
      `INSERT INTO vijaya."ContentVersion" ("id", "entryId", "payload", "actorId", "createdAt")
       VALUES ($1,$2,$3::jsonb,$4,now())`,
      [randomUUID(), next.id, draft, actor.admin.id],
    );
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
  await query(
    `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "actorId", "ip", "createdAt")
     VALUES ($1,$2,'ContentEntry','site',$3,$4,now())`,
    [randomUUID(), flag ? "PREVIEW_ENABLED" : "PREVIEW_DISABLED", actor.admin.id, actor.ip],
  );
  return success({ preview: flag });
}
