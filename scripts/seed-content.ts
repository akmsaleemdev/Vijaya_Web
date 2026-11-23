import { loadEnvConfig } from "@next/env";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import { getPool, transaction, type DbExecutor } from "../src/lib/db";
import { contentCatalog } from "../src/lib/cms/catalog";

export async function seedContent(client: DbExecutor, force = false) {
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [20261123, 1]);
  let inserted = 0;
  for (const [key, payload] of Object.entries(contentCatalog)) {
    const serialized = JSON.stringify(payload);
    const result = await client.query(
      `INSERT INTO vijaya."ContentEntry" ("id","key","locale","draft","published","editedBy","updatedAt")
       VALUES ($1,$2,'en',$3::jsonb,$3::jsonb,'seed',now())
       ON CONFLICT ("key","locale") DO ${force
         ? `UPDATE SET "draft" = EXCLUDED."draft", "published" = EXCLUDED."published", "editedBy" = 'seed', "updatedAt" = now()`
         : "NOTHING"}`,
      [randomUUID(), key, serialized],
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

if (process.argv[1] && basename(process.argv[1]) === "seed-content.ts") {
  loadEnvConfig(process.cwd());
  transaction((client) => seedContent(client, process.argv.includes("--force")))
    .then((count) => console.log(`CMS seed wrote ${count} entries.`))
    .catch((error: unknown) => { console.error("CMS seed failed:", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; })
    .finally(() => getPool().end());
}
