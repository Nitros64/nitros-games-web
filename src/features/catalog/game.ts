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

export function decodeGame(value: unknown): Game | null {
  if (!isGame(value)) return null;
  return { id: value.id, name: value.name, description: value.description, jam: value.jam,
    developerCount: value.developerCount, genreIds: value.genreIds, publicationStatus: value.publicationStatus };
}

export function decodeAllGames(value: unknown): Game[] | null {
  if (!Array.isArray(value) || !value.every(isGame)) return null;
  if (new Set(value.map(game => game.id)).size !== value.length) return null;
  return value.map(game => ({ id: game.id, name: game.name, description: game.description, jam: game.jam,
    developerCount: game.developerCount, genreIds: game.genreIds, publicationStatus: game.publicationStatus }));
}

export function decodeGames(value: unknown): Game[] | null {
  const games = decodeAllGames(value);
  return games?.filter(game => game.publicationStatus === "PUBLISHED") ?? null;
}
