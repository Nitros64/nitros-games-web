/** Public GameResponse contract; genre names and artwork are separate resources. */
export type Game = {
  id: number;
  name: string;
  description: string;
  jam: boolean;
  developerCount: number;
  genreIds: number[];
  publicationStatus: "PUBLISHED" | "DRAFT";
};

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isGame(value: unknown): value is Game {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && positiveInteger(value.id) &&
    "name" in value && typeof value.name === "string" && value.name.trim().length > 0 &&
    "description" in value && typeof value.description === "string" &&
    "jam" in value && typeof value.jam === "boolean" &&
    "developerCount" in value && positiveInteger(value.developerCount) &&
    "genreIds" in value && Array.isArray(value.genreIds) && value.genreIds.every(positiveInteger) &&
    "publicationStatus" in value && (value.publicationStatus === "PUBLISHED" || value.publicationStatus === "DRAFT");
}

export function decodeGames(value: unknown): Game[] | null {
  if (!Array.isArray(value) || !value.every(isGame)) return null;
  if (new Set(value.map(game => game.id)).size !== value.length) return null;
  // Defense in depth; Spring Boot remains responsible for publication access.
  return value.filter(game => game.publicationStatus === "PUBLISHED").map(game => ({
    id: game.id, name: game.name, description: game.description, jam: game.jam,
    developerCount: game.developerCount, genreIds: game.genreIds,
    publicationStatus: game.publicationStatus,
  }));
}
