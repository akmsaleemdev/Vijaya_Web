import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/lib/db";
import { bookingTransaction } from "@/lib/booking/transaction";
import { audit, failure, success, type Identity } from "./http";

import { assetId, uploadsDir, uploadPath } from "@/lib/media/upload-storage";
const uploadMeta = z.object({ alt: z.string().max(300), folder: z.string().max(80), tags: z.string().max(250) });
const maxSize = 40 * 1024 * 1024;

function sniff(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  if (buffer.subarray(4, 8).toString() === "ftyp") return { ext: "mp4", mime: "video/mp4" };
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && buffer.subarray(0, 4096).includes("webm")) return { ext: "webm", mime: "video/webm" };
  return null;
}

export async function media(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") return success(await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 300 }));
  if (req.method === "DELETE") {
    if (!assetId.safeParse(id).success) return failure(422, "INVALID_FILE", "Choose a valid file.");
    const removed = await bookingTransaction(async (tx) => {
      const row = await tx.mediaAsset.findUnique({ where: { id } });
      if (!row) return failure(404, "NOT_FOUND", "File not found.");
      const contains = `/api/media/${row.id}.`;
      const references = await tx.contentEntry.count({ where: { OR: [{ draft: { contains } }, { published: { contains } }] } })
        + await tx.contentVersion.count({ where: { payload: { contains } } });
      if (references) return failure(409, "MEDIA_IN_USE", "The file is referenced by current content or saved history.");
      await tx.mediaAsset.delete({ where: { id } });
      await audit(tx, actor, "MEDIA_DELETED", "MediaAsset", row.id, row);
      return row;
    });
    if (removed instanceof Response) return removed;
    await unlink(uploadPath(removed.filename)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") console.error("Media file cleanup failed", removed.id);
    });
    return success({ id });
  }
  if (Number(req.headers.get("content-length")) > maxSize + 8192) return failure(413, "FILE_TOO_LARGE", "Upload a file under 40 MB.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const meta = uploadMeta.safeParse({ alt: form?.get("alt") ?? "", folder: form?.get("folder") ?? "", tags: form?.get("tags") ?? "" });
  if (!(file instanceof File) || !file.size || file.size > maxSize || !meta.success) return failure(422, "INVALID_FILE", "Choose a supported file and enter valid metadata.");
  let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name).slice(1).toLowerCase();
  let type = sniff(buffer);
  if (["jpg", "jpeg", "png", "webp", "avif"].includes(extension)) {
    try {
      const image = sharp(buffer, { limitInputPixels: 40_000_000 });
      const format = (await image.metadata()).format;
      if (!format || !["jpeg", "png", "webp", "heif"].includes(format)) throw new Error("Unsupported image format.");
      buffer = await image.rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
      type = { ext: "webp", mime: "image/webp" };
    } catch {
      return failure(422, "INVALID_IMAGE", "Upload a valid JPEG, PNG, WebP or AVIF image.");
    }
  } else if (extension !== type?.ext) {
    return failure(422, "INVALID_FILE", "Upload an image, MP4, WebM or PDF.");
  }
  if (!type) return failure(422, "INVALID_FILE", "Unsupported file.");
  const idValue = randomUUID();
  const filename = `${idValue}.${type.ext}`;
  const target = uploadPath(filename);
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(target, buffer, { flag: "wx", mode: 0o600 });
  try {
    const row = await bookingTransaction(async (tx) => {
      const item = await tx.mediaAsset.create({ data: { id: idValue, filename, mime: type.mime, size: buffer.length, ...meta.data } });
      await audit(tx, actor, "MEDIA_UPLOADED", "MediaAsset", item.id, undefined, item);
      return item;
    });
    return success(row, 201);
  } catch (error) {
    await unlink(target).catch(() => undefined);
    throw error;
  }
}
