export type Genre = { id: number; name: string };
export type GameInput = { name: string; description: string; jam: boolean; developerCount: number; genreIds: number[] };
export type FormState = { error?: string; fields?: Partial<Record<keyof GameInput, string>> };

export function parseId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
export function decodeGenres(value: unknown): Genre[] | null {
  if (!Array.isArray(value)) return null;
  const result: Genre[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || !("id" in entry) || typeof entry.id !== "number" ||
        !Number.isSafeInteger(entry.id) || entry.id < 1 || !("name" in entry) || typeof entry.name !== "string" || !entry.name.trim()) return null;
    result.push({ id: entry.id, name: entry.name });
  }
  return new Set(result.map(genre => genre.id)).size === result.length ? result : null;
}

export function validateGame(form: FormData): { data: GameInput; fields: NonNullable<FormState["fields"]> } {
  const text = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  const name = text("name"), description = text("description");
  const developerCount = parseId(form.get("developerCount")) ?? 0;
  const genreValues = form.getAll("genreIds");
  const genreIds = genreValues.map(parseId).filter((id): id is number => id !== null);
  const fields: NonNullable<FormState["fields"]> = {};
  if (name.length < 4 || name.length > 30) fields.name = "Use between 4 and 30 characters.";
  if (description.length < 4 || description.length > 30) fields.description = "Use between 4 and 30 characters.";
  if (developerCount < 1 || developerCount > 2147483647) fields.developerCount = "Enter a positive whole number up to 2147483647.";
  if (!genreIds.length || genreIds.length !== genreValues.length) fields.genreIds = "Select at least one valid genre.";
  return { data: { name, description, jam: form.get("jam") === "on", developerCount, genreIds: [...new Set(genreIds)] }, fields };
}
