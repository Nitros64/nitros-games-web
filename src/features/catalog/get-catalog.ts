import "server-only";
import { backendOrigin } from "@/server/backend";
import { getJson, type Result } from "@/server/http";
import { decodeGames, type Game } from "./game";

export async function getCatalog(): Promise<Result<Game[]>> {
  const origin = backendOrigin();
  if (!origin) return { ok: false, error: { kind: "configuration" } };
  return getJson(new URL("/api/v1/games", origin), decodeGames);
}
