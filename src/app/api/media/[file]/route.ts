import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { db } from "@/lib/db";
import { assetId, uploadPath } from "@/lib/media/upload-storage";

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const id = file.split(".")[0];
  if (!assetId.safeParse(id).success) return new Response(null, { status: 404 });
  const row = await db.mediaAsset.findUnique({ where: { id } });
  if (!row || row.filename !== file || path.basename(file) !== file) return new Response(null, { status: 404 });
  const target = uploadPath(file);
  const handle = await open(target, "r").catch(() => null);
  if (!handle) return new Response(null, { status: 404 });
  const size = (await handle.stat()).size;
  await handle.close();
  const range = req.headers.get("range")?.match(/^bytes=(\d+)-(\d*)$/);
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const headers = new Headers({
    "Content-Type": row.mime, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=300", "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (row.mime === "application/pdf") headers.set("Content-Disposition", `attachment; filename="${file}"`);
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  const stream = Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(stream, { status: range ? 206 : 200, headers });
}
