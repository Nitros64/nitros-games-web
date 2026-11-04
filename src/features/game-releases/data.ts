import "server-only";
import { adminRequest } from "@/server/admin-http";
import type { Session } from "@/server/auth/store";
import type { Result } from "@/server/http";
import { decodeGenres as decodeOptions } from "@/features/admin-games/contracts";
import { decodeVersions, decodeVersion, decodeDownloads, decodeDownload, decodePairs, type ReleaseOptions } from "./contracts";

export const versionPath = (gameId: number) => `/api/v1/games/${gameId}/versions`;
export const adminVersionPath = (gameId: number) => `/api/v1/admin/games/${gameId}/versions`;
export const versions = (session: Session, gameId: number) => adminRequest(session, adminVersionPath(gameId), value => {
  const result = decodeVersions(value); return result?.every(v => v.gameId === gameId) ? result : null;
});
export const version = (session: Session, gameId: number, versionId: number) => adminRequest(session, `${adminVersionPath(gameId)}/${versionId}`, value => {
  const result = decodeVersion(value); return result?.gameId === gameId && result.id === versionId ? result : null;
});
export const downloads = (session: Session, gameId: number, versionId: number) => adminRequest(session, `${adminVersionPath(gameId)}/${versionId}/download-links`, value => {
  const result = decodeDownloads(value); return result?.every(link => link.gameVersionId === versionId) ? result : null;
});
export const download = (session: Session, gameId: number, versionId: number, linkId: number) => adminRequest(session, `${adminVersionPath(gameId)}/${versionId}/download-links/${linkId}`, value => {
  const result = decodeDownload(value); return result?.gameVersionId === versionId && result.id === linkId ? result : null;
});
export const hosts = (session: Session) => adminRequest(session, "/api/v1/server-host-images", decodeOptions);
export async function releaseOptions(session: Session): Promise<Result<ReleaseOptions>> {
  const [languages, tools, platforms, processors, pairs] = await Promise.all([
    adminRequest(session, "/api/v1/programming-languages", decodeOptions), adminRequest(session, "/api/v1/programming-tools", decodeOptions),
    adminRequest(session, "/api/v1/platforms", decodeOptions), adminRequest(session, "/api/v1/processors", decodeOptions),
    adminRequest(session, "/api/v1/language-tools", decodePairs),
  ]);
  if (!languages.ok) return languages; if (!tools.ok) return tools; if (!platforms.ok) return platforms;
  if (!processors.ok) return processors; if (!pairs.ok) return pairs;
  return { ok: true, data: { languages: languages.data, tools: tools.data, platforms: platforms.data, processors: processors.data, pairs: pairs.data } };
}
