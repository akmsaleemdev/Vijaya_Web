import { loadEnvConfig } from "@next/env";
import { PrismaClient, type Prisma } from "@prisma/client";
import { basename } from "node:path";
import { contentCatalog } from "../src/lib/cms/catalog";

export async function seedContent(db: PrismaClient, force = false) {
  const entries = Object.entries(contentCatalog).map(([key, payload]) => ({
    key, locale: "en", draft: payload as Prisma.InputJsonValue,
    published: payload as Prisma.InputJsonValue, editedBy: "seed",
  }));
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261123, 1) IS NULL AS locked`;
    if (!force) return (await tx.contentEntry.createMany({ data: entries, skipDuplicates: true })).count;
    for (const data of entries) {
      const { key, locale, ...update } = data;
      await tx.contentEntry.upsert({ where: { key_locale: { key, locale } }, create: data, update });
    }
    return entries.length;
  }, { timeout: 30_000 });
}

if (process.argv[1] && basename(process.argv[1]) === "seed-content.ts") {
  loadEnvConfig(process.cwd());
  const db = new PrismaClient();
  seedContent(db, process.argv.includes("--force"))
    .then((count) => console.log(`CMS seed wrote ${count} entries.`))
    .catch(() => { console.error("CMS seed failed."); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
