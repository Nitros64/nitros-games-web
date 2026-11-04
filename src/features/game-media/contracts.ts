export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PIXELS = 20_000_000;
export type GameMedia = {
  id: number; gameId: number; type: "COVER" | "SCREENSHOT"; position: number;
  altText: string; caption: string; contentType: "image/png" | "image/jpeg";
  byteSize: number; width: number; height: number; contentUrl: string;
};
export const mediaPath = (gameId: number, admin = true) => `/api/v1/${admin ? "admin/" : ""}games/${gameId}/media`;
export const imagePath = (gameId: number, mediaId: number, admin = false) => `/api/${admin ? "admin/" : ""}games/${gameId}/media/${mediaId}/content`;
export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function positiveId(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
export function metadataValid(altText: unknown, caption: unknown): boolean {
  return typeof altText === "string" && altText.length <= 200 && typeof caption === "string" && caption.length <= 500;
}
export function decodeMedia(value: unknown, gameId: number, admin = true): GameMedia | null {
  if (!isRecord(value)) return null;
  const { id, type, position, altText, caption, contentType, byteSize, width, height, contentUrl } = value;
  if (!positiveId(id) || value.gameId !== gameId || (type !== "COVER" && type !== "SCREENSHOT") ||
    typeof position !== "number" || !Number.isSafeInteger(position) || (type === "COVER" ? position !== 0 : position < 1) ||
    typeof altText !== "string" || typeof caption !== "string" || !metadataValid(altText, caption) ||
    (contentType !== "image/png" && contentType !== "image/jpeg") || !positiveId(byteSize) ||
    !positiveId(width) || !positiveId(height) || width * height > MAX_PIXELS ||
    contentUrl !== `${mediaPath(gameId, admin)}/${id}/content`) return null;
  return { id, gameId, type, position, altText, caption, contentType, byteSize, width, height, contentUrl };
}
export function decodeMediaList(value: unknown, gameId: number, admin = true): GameMedia[] | null {
  if (!Array.isArray(value)) return null;
  const items: GameMedia[] = [];
  for (const raw of value) { const item = decodeMedia(raw, gameId, admin); if (!item) return null; items.push(item); }
  if (new Set(items.map(item => item.id)).size !== items.length || items.filter(item => item.type === "COVER").length > 1) return null;
  items.sort((a, b) => a.position - b.position);
  if (items.filter(item => item.type === "SCREENSHOT").some((item, index) => item.position !== index + 1)) return null;
  return items;
}
export function uploadError(file: File): string | null {
  if (file.size === 0) return "Choose a non-empty image.";
  if (file.size > MAX_FILE_BYTES) return "The image exceeds 10 MiB.";
  if (!/^[^/\\\x00-\x1f\x7f]{1,120}$/.test(file.name) ||
    !((file.type === "image/png" && /\.png$/i.test(file.name)) || (file.type === "image/jpeg" && /\.jpe?g$/i.test(file.name))))
    return "Choose a PNG or JPEG with a matching filename and format (filename up to 120 characters).";
  return null;
}
