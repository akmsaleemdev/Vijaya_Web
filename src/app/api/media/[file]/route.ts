import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { supabaseMedia } from "@/lib/media/remote-storage";
import { db } from "@/lib/db";
import { assetId, uploadPath } from "@/lib/media/upload-storage";

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const id = file.split(".")[0];
  if (!assetId.safeParse(id).success) return new Response(null, { status: 404 });
  const row = await db.mediaAsset.findUnique({ where: { id } });
  if (!row || row.filename !== file || path.basename(file) !== file) return new Response(null, { status: 404 });
  const storage = supabaseMedia();
  if (storage) {
    const { data, error } = await storage.createSignedUrl(file, 60);
    if (error || !data) return new Response(null, { status: 404 });
    const range = req.headers.get("range");
    const upstream = await fetch(data.signedUrl, { headers: range ? { range } : {}, cache: "no-store" });
    if (upstream.status === 416) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${row.size}` } });
    if (!upstream.ok || !upstream.body) return new Response(null, { status: 502 });
    const headers = responseHeaders(row.mime, file);
    for (const name of ["accept-ranges", "content-range", "content-length"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  }
  const target = uploadPath(file);
  const handle = await open(target, "r").catch(() => null);
  if (!handle) return new Response(null, { status: 404 });
  const size = (await handle.stat()).size;
  await handle.close();
  const range = req.headers.get("range")?.match(/^bytes=(\d+)-(\d*)$/);
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const headers = responseHeaders(row.mime, file);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  const stream = Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(stream, { status: range ? 206 : 200, headers });
}


function responseHeaders(mime: string, file: string) {
  const headers = new Headers({
    "Content-Type": mime, "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=300", "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (mime === "application/pdf") headers.set("Content-Disposition", `attachment; filename="${file}"`);
  return headers;
}
