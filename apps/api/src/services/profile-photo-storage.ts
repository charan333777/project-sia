import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfilePhotoType = (typeof PROFILE_PHOTO_TYPES)[number];

export interface ProfilePhotoStorage {
  upload(userId: string, bytes: Buffer, contentType: ProfilePhotoType): Promise<string>;
  remove(path: string): Promise<void>;
  createSignedUrl(path: string): Promise<string>;
}

export function detectProfilePhotoType(bytes: Buffer): ProfilePhotoType | null {
  if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

function stripJpegMetadata(bytes: Buffer) {
  const parts = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset < bytes.length) {
    const markerStart = offset;
    if (bytes[offset] !== 0xff) {
      parts.push(bytes.subarray(offset));
      break;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined) break;
    if (marker === 0xda || marker === 0xd9) {
      parts.push(bytes.subarray(markerStart));
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      parts.push(bytes.subarray(markerStart, offset));
      continue;
    }
    if (offset + 2 > bytes.length) return bytes;
    const length = bytes.readUInt16BE(offset);
    const end = offset + length;
    if (length < 2 || end > bytes.length) return bytes;
    // APP1 contains EXIF/XMP (including GPS); APP13 may contain IPTC location data.
    if (marker !== 0xe1 && marker !== 0xed) parts.push(bytes.subarray(markerStart, end));
    offset = end;
  }
  return Buffer.concat(parts);
}

function stripPngMetadata(bytes: Buffer) {
  const parts = [bytes.subarray(0, 8)];
  const metadataChunks = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return bytes;
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (!metadataChunks.has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (type === "IEND") break;
  }
  return Buffer.concat(parts);
}

function stripWebpMetadata(bytes: Buffer) {
  const chunks: Buffer[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    const length = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) return bytes;
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = Buffer.from(bytes.subarray(offset, end));
      if (type === "VP8X" && chunk.length > 8) chunk[8] = (chunk[8] ?? 0) & ~0x0c;
      chunks.push(chunk);
    }
    offset = end;
  }
  const result = Buffer.concat([Buffer.from("RIFF\0\0\0\0WEBP", "binary"), ...chunks]);
  result.writeUInt32LE(result.length - 8, 4);
  return result;
}

export function sanitizeProfilePhoto(bytes: Buffer, contentType: ProfilePhotoType) {
  if (contentType === "image/jpeg") return stripJpegMetadata(bytes);
  if (contentType === "image/png") return stripPngMetadata(bytes);
  return stripWebpMetadata(bytes);
}

export class SupabaseProfilePhotoStorage implements ProfilePhotoStorage {
  private readonly client: SupabaseClient;

  constructor(
    url: string,
    serviceRoleKey: string,
    private readonly bucket: string,
  ) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async upload(userId: string, bytes: Buffer, contentType: ProfilePhotoType) {
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${randomUUID()}.${extension}`;
    const { error } = await this.client.storage.from(this.bucket).upload(path, bytes, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Profile photo upload failed: ${error.message}`);
    return path;
  }

  async remove(path: string) {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) throw new Error(`Profile photo removal failed: ${error.message}`);
  }

  async createSignedUrl(path: string) {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(path, 60 * 60);
    if (error) throw new Error(`Profile photo URL failed: ${error.message}`);
    return data.signedUrl;
  }
}
