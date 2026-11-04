export type Option = { id: number; name: string };
export type Compatibility = { programmingLanguageId: number; programmingToolId: number };
export type VersionInput = Compatibility & { name: string; platformId: number; processorId: number };
export type Version = VersionInput & { id: number; gameId: number };
export type Download = { id: number; gameVersionId: number; link: string; serverHostImageId: number };
export type ReleaseOptions = { languages: Option[]; tools: Option[]; platforms: Option[]; processors: Option[]; pairs: Compatibility[] };
export type ReleaseState = { error?: string };

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const id = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export function safeDownloadUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 4 || value.length > 100 || value !== value.trim() || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function decodeVersion(value: unknown): Version | null {
  if (!record(value) || !id(value.id) || !id(value.gameId) || typeof value.name !== "string" || value.name.length < 4 || value.name.length > 30 ||
      !id(value.programmingLanguageId) || !id(value.programmingToolId) || !id(value.platformId) || !id(value.processorId)) return null;
  return { id: value.id, gameId: value.gameId, name: value.name, programmingLanguageId: value.programmingLanguageId,
    programmingToolId: value.programmingToolId, platformId: value.platformId, processorId: value.processorId };
}
export function decodeDownload(value: unknown): Download | null {
  if (!record(value) || !id(value.id) || !id(value.gameVersionId) || !safeDownloadUrl(value.link) || !id(value.serverHostImageId)) return null;
  return { id: value.id, gameVersionId: value.gameVersionId, link: value.link, serverHostImageId: value.serverHostImageId };
}
function decodeList<T extends { id: number }>(value: unknown, decode: (entry: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const items: T[] = [];
  for (const entry of value) { const item = decode(entry); if (!item || items.some(other => other.id === item.id)) return null; items.push(item); }
  return items;
}
export const decodeVersions = (value: unknown) => decodeList(value, decodeVersion);
export const decodeDownloads = (value: unknown) => decodeList(value, decodeDownload);
export function decodePairs(value: unknown): Compatibility[] | null {
  if (!Array.isArray(value)) return null;
  const pairs: Compatibility[] = [];
  for (const entry of value) {
    if (!record(entry) || !id(entry.programmingLanguageId) || !id(entry.programmingToolId)) return null;
    pairs.push({ programmingLanguageId: entry.programmingLanguageId, programmingToolId: entry.programmingToolId });
  }
  return pairs;
}
