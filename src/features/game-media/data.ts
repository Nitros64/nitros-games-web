import "server-only";
import type { Session } from "@/server/auth/store";
import { adminRequest } from "@/server/admin-http";
import { backendOrigin } from "@/server/backend";
import { getJson, type Result } from "@/server/http";
import { decodeMediaList, mediaPath, type GameMedia } from "./contracts";

export const adminMedia = (session: Session, gameId: number) => adminRequest(session, mediaPath(gameId), value => decodeMediaList(value, gameId));
export function publicMedia(gameId: number): Promise<Result<GameMedia[]>> {
  const origin = backendOrigin();
  return origin ? getJson(new URL(mediaPath(gameId, false), origin), value => decodeMediaList(value, gameId, false))
    : Promise.resolve({ ok: false, error: { kind: "configuration" } });
}
