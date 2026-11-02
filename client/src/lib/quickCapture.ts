import ExifReader from "exifreader";
import { api } from "@/lib/api";

export interface PhotoMeta {
  lat?: number;
  lng?: number;
  takenAt?: Date;
}

function gpsToDecimal(value: any, ref: string): number {
  if (!Array.isArray(value) || value.length !== 3) return NaN;
  const part = (v: any) => (Array.isArray(v) ? v[0] / (v[1] || 1) : Number(v));
  const decimal = part(value[0]) + part(value[1]) / 60 + part(value[2]) / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

function refOf(tag: any, fallback: string): string {
  const v = tag?.value;
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length) return String(v[0]);
  return fallback;
}

/** GPS and capture time from the photo's EXIF (both optional). */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const tags: any = await ExifReader.load(file);
    const meta: PhotoMeta = {};
    if (tags.GPSLatitude && tags.GPSLongitude) {
      const lat = gpsToDecimal(tags.GPSLatitude.value, refOf(tags.GPSLatitudeRef, "N"));
      const lng = gpsToDecimal(tags.GPSLongitude.value, refOf(tags.GPSLongitudeRef, "E"));
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) Object.assign(meta, { lat, lng });
    }
    // "2026:11:01 10:12:33" in the camera's local time
    const raw = tags.DateTimeOriginal?.description as string | undefined;
    const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      if (!isNaN(d.getTime())) meta.takenAt = d;
    }
    return meta;
  } catch {
    return {};
  }
}

/** Current position, or null if denied/unavailable within the timeout. */
export function getCurrentPosition(timeoutMs = 6000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** Downscale to fit the 5MB upload limit and save storage (also drops EXIF). */
export async function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // e.g. HEIC the browser can't decode: upload as-is
  }
}

const FRESH_MS = 30 * 60 * 1000;

/**
 * One photo → one record. Location: photo GPS first; the device's current position only
 * when the photo was just taken (an old library photo would get the wrong place).
 */
export async function captureFromPhoto(tripId: string, file: File) {
  const meta = await readPhotoMeta(file);
  const isFresh = !meta.takenAt || Date.now() - meta.takenAt.getTime() < FRESH_MS;
  const [spot, upload, here] = await Promise.all([
    api.spots.create(tripId, {}),
    resizeImage(file),
    meta.lat === undefined && isFresh ? getCurrentPosition() : Promise.resolve(null),
  ]);
  await api.photos.upload(spot.id, [upload]);
  const loc =
    meta.lat !== undefined
      ? { lat: meta.lat, lng: meta.lng, locationSource: "photo" }
      : here
        ? { ...here, locationSource: "current" }
        : {};
  await api.spots.update(spot.id, { ...loc, capturedAt: (meta.takenAt ?? new Date()).toISOString() });
  return spot as { id: string };
}

/** Add a photo to an existing record (e.g. a memo written first). Fills location only if missing. */
export async function addPhotoToSpot(spot: { id: string; lat: number | null }, file: File) {
  const [meta, upload] = await Promise.all([readPhotoMeta(file), resizeImage(file)]);
  await api.photos.upload(spot.id, [upload]);
  if (spot.lat == null && meta.lat !== undefined) {
    await api.spots.update(spot.id, { lat: meta.lat, lng: meta.lng, locationSource: "photo" });
  }
}

/** A words-only record at the current place and time. */
export async function captureVoiceOnly(tripId: string) {
  const [spot, here] = await Promise.all([api.spots.create(tripId, {}), getCurrentPosition()]);
  await api.spots.update(spot.id, {
    ...(here ? { ...here, locationSource: "current" } : {}),
    capturedAt: new Date().toISOString(),
  });
  return spot as { id: string };
}

export function momentTime(spot: { capturedAt?: string | null; createdAt: string }) {
  return new Date(spot.capturedAt ?? spot.createdAt);
}

export function autoTripTitle(d = new Date()) {
  return `${d.getMonth() + 1}月の旅`;
}
