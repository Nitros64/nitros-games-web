import "server-only";
import { adminRequest } from "@/server/admin-http";
import type { Session } from "@/server/auth/store";
import type { DataError } from "@/server/http";
import { decodeAllGames, decodeGame } from "@/features/catalog/game";
import { decodeGenres } from "./contracts";

export const listAdminGames = (session: Session) => adminRequest(session, "/api/v1/admin/games", decodeAllGames);
export const getAdminGame = (session: Session, id: number) => adminRequest(session, `/api/v1/admin/games/${id}`, decodeGame);
export const listGenres = (session: Session) => adminRequest(session, "/api/v1/game-genres", decodeGenres);

export function errorMessage(error: DataError): string {
  if (error.kind === "http") {
    if (error.status === 401) return "Your session is no longer accepted. Sign out and sign in again.";
    if (error.status === 403) return "Access denied. Spring Boot requires ADMIN permission.";
    if (error.status === 404) return "This game no longer exists. Return to the game list.";
    if (error.status === 400 || error.status === 422) return "The backend rejected the values. Review the fields and selected genres.";
    if (error.status === 409) return "This change conflicts with the current data. Reload and review before trying again.";
  }
  if (error.kind === "invalid-data") return "The backend returned an unexpected response.";
  return "The service is unavailable. Reload to check whether the operation completed before trying again.";
}
