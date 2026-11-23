import path from "node:path";
import { z } from "zod";

export const assetId = z.uuid();
export const uploadsDir = () => path.resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR ?? "uploads");
export const uploadPath = (filename: string) => path.join(/* turbopackIgnore: true */ uploadsDir(), filename);
