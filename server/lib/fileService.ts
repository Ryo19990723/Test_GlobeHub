import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import crypto from "crypto";

export interface SaveFileResult {
  url: string;
  hash: string;
  filename: string;
}

export class FileService {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir: string = "uploads", baseUrl: string = "/uploads") {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
  }

  async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
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

  async save(file: Express.Multer.File): Promise<SaveFileResult> {
    await this.ensureUploadDir();

    const filename = this.generateFilename(file.originalname);
    const filepath = path.join(this.uploadDir, filename);
    const hash = this.generateHash(file.buffer);

    await fs.writeFile(filepath, file.buffer);

    return {
      url: this.getUrl(filename),
      hash,
      filename,
    };
  }

  async delete(filename: string): Promise<void> {
    const filepath = path.join(this.uploadDir, filename);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  getUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`;
  }
}

export const fileService = new FileService();
