import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SaveFileResult {
  url: string;
  hash: string;
  filename: string;
}

const BUCKET = "uploads";

// Supabase Storage when configured (production: Render's free disk is wiped on restart),
// local ./uploads otherwise (offline development).
export class FileService {
  private uploadDir: string;
  private baseUrl: string;
  private client: SupabaseClient | null | undefined;
  private bucketReady: Promise<void> | null = null;

  constructor(uploadDir: string = "uploads", baseUrl: string = "/uploads") {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
  }

  // Created lazily: env vars may not be loaded yet when this module is imported.
  private get supabase(): SupabaseClient | null {
    if (this.client === undefined) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY;
      this.client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
    }
    return this.client;
  }

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      const { data } = await this.supabase!.storage.getBucket(BUCKET);
      if (data) return;
      const { error } = await this.supabase!.storage.createBucket(BUCKET, { public: true });
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((err) => {
      this.bucketReady = null; // retry on next upload
      throw err;
    });
    return this.bucketReady;
  }

  /** For /api/health: "ok", "local" (no Supabase configured), or the storage error message. */
  async check(): Promise<string> {
    if (!this.supabase) return "local";
    try {
      await this.ensureBucket();
      return "ok";
    } catch (err: any) {
      return String(err?.message ?? err).slice(0, 200);
    }
  }

  private generateHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  }

  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const id = nanoid(10);
    const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 20);
    return `${safeName}_${id}${ext}`;
  }

  /** folder: optional sub-folder such as "avatars" */
  async save(file: Express.Multer.File, folder = ""): Promise<SaveFileResult> {
    const filename = this.generateFilename(file.originalname);
    const objectPath = folder ? `${folder}/${filename}` : filename;
    const hash = this.generateHash(file.buffer);

    if (this.supabase) {
      await this.ensureBucket();
      const { error } = await this.supabase.storage
        .from(BUCKET)
        .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw error;
      const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(objectPath);
      return { url: data.publicUrl, hash, filename };
    }

    const dir = path.join(this.uploadDir, folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), file.buffer);
    return { url: `${this.baseUrl}/${objectPath}`, hash, filename };
  }

  /** Delete by the URL stored in the DB (works for both backends). */
  async deleteByUrl(url: string): Promise<void> {
    const objectPath = this.objectPathFromUrl(url);
    if (!objectPath) return;

    if (this.supabase && /^https?:/.test(url)) {
      const { error } = await this.supabase.storage.from(BUCKET).remove([objectPath]);
      if (error) throw error;
      return;
    }

    try {
      await fs.unlink(path.join(this.uploadDir, objectPath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /** Read a stored file back (e.g. for EXIF). */
  async read(url: string): Promise<Buffer> {
    if (/^https?:/.test(url)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
    const objectPath = this.objectPathFromUrl(url);
    if (!objectPath) throw new Error(`unknown file url: ${url}`);
    return fs.readFile(path.join(this.uploadDir, objectPath));
  }

  private objectPathFromUrl(url: string): string | null {
    const publicPrefix = `/storage/v1/object/public/${BUCKET}/`;
    const i = url.indexOf(publicPrefix);
    if (i >= 0) return decodeURIComponent(url.slice(i + publicPrefix.length));
    if (url.startsWith(`${this.baseUrl}/`)) return url.slice(this.baseUrl.length + 1);
    return null;
  }
}

export const fileService = new FileService();
