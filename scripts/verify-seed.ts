import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { contentCatalog } from "../src/lib/cms/catalog";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function verify() {
  const rows = await db.contentEntry.findMany({ where: { locale: "en" } });
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
void verify().catch(() => { console.error("Seed verification failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
