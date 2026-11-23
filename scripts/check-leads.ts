import { loadEnvConfig } from "@next/env";
import { getPool, query } from "../src/lib/db";
import type { Lead } from "../src/lib/db/types";

loadEnvConfig(process.cwd());
try {
  const { rows } = await query<Pick<Lead, "type" | "name" | "email" | "eventDate" | "stage" | "createdAt">>(
    `SELECT "type","name","email","eventDate","stage","createdAt" FROM vijaya."Lead" ORDER BY "createdAt" DESC LIMIT 6`,
  );
  console.log(JSON.stringify(rows, null, 1));
} finally {
  await getPool().end();
}
