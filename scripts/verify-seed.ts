import { loadEnvConfig } from "@next/env";
import { isDeepStrictEqual } from "node:util";
import { contentCatalog } from "../src/lib/cms/catalog";
import { getPool, query } from "../src/lib/db";
import type { ContentEntry } from "../src/lib/db/types";

loadEnvConfig(process.cwd());
async function verify() {
  const { rows } = await query<ContentEntry>(`SELECT * FROM vijaya."ContentEntry" WHERE "locale" = 'en'`);
  const indexed = new Map(rows.map((row) => [row.key, row]));
  let differences = 0;
  for (const [key, expected] of Object.entries(contentCatalog)) {
    const row = indexed.get(key);
    const value = JSON.parse(JSON.stringify(expected));
    if (!row || !isDeepStrictEqual(value, row.published) || !isDeepStrictEqual(value, row.draft)) {
      console.error(`${key}: ${row ? "differs from the source" : "missing"}`);
      differences++;
    }
  }
  console.log(`${Object.keys(contentCatalog).length} CMS entries checked. ${differences} differences.`);
  if (differences) process.exitCode = 1;
}
void verify()
  .catch((error: unknown) => { console.error("Seed verification failed:", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; })
  .finally(() => getPool().end());
